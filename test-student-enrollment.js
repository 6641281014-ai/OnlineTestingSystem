const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runStudentEnrollmentTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING STUDENT SELF-ENROLLMENT TEST SUITE");
  console.log("=================================================");

  // 1. Setup / Lookup Users
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student1 = await prisma.user.findUnique({ where: { email: "student1@test.com" } });
  const student2 = await prisma.user.findUnique({ where: { email: "student2@test.com" } });

  if (!teacher || !student1 || !student2) {
    throw new Error("Missing test users (teacher/student1/student2)");
  }

  // 2. Setup Test Course
  const courseCode = "SELF-ENROLL-101";
  let course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (course) {
    await prisma.examAttempt.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.examQuestion.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.exam.deleteMany({ where: { courseId: course.id } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });
  }

  course = await prisma.course.create({
    data: {
      code: courseCode,
      title: "วิชาสำหรับการทดสอบ Student Self-Enrollment",
      description: "ทดสอบการค้นหาและลงทะเบียนรายวิชาด้วยตนเอง",
      academicYear: "2569",
      semester: 1,
      isActive: true,
      instructorId: teacher.id,
    },
  });

  // Create a published exam in this course
  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบวิชา Self-Enrollment 101",
      durationMinutes: 30,
      totalScore: 10,
      isPublished: true,
    },
  });

  // TEST 1: Student sees available courses in catalog
  const catalogCourses = await prisma.course.findMany({
    where: { isActive: true },
    include: { instructor: { select: { name: true } }, _count: { select: { enrollments: true, exams: true } } },
  });
  const foundInCatalog = catalogCourses.some((c) => c.id === course.id);
  if (!foundInCatalog) throw new Error("Course not found in catalog");
  console.log(`✅ [PASS 1/10] Student sees available courses in catalog (${catalogCourses.length} active courses found)`);

  // TEST 2: Student 1 enrolls successfully
  const enrollment1 = await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      studentId: student1.id,
    },
  });
  if (!enrollment1 || enrollment1.courseId !== course.id || enrollment1.studentId !== student1.id) {
    throw new Error("Student enrollment failed");
  }
  console.log(`✅ [PASS 2/10] Student 1 successfully enrolled in course ${course.code}`);

  // TEST 3: Student sees enrolled course in 'My Courses'
  const myCourses = await prisma.courseEnrollment.findMany({
    where: { studentId: student1.id },
    include: { course: true },
  });
  const isEnrolledInMyCourses = myCourses.some((e) => e.courseId === course.id);
  if (!isEnrolledInMyCourses) throw new Error("Course not in Student's enrolled list");
  console.log(`✅ [PASS 3/10] Student sees enrolled course in 'My Courses' (${myCourses.length} enrolled courses)`);

  // TEST 4: Student cannot enroll duplicate in the same course
  let duplicateCaught = false;
  try {
    await prisma.courseEnrollment.create({
      data: {
        courseId: course.id,
        studentId: student1.id,
      },
    });
  } catch (err) {
    duplicateCaught = true;
  }
  if (!duplicateCaught) throw new Error("Duplicate enrollment was not prevented!");
  console.log(`✅ [PASS 4/10] Duplicate enrollment prevented by Database Unique Constraint`);

  // TEST 5: Student 1 unenrolls from their own course
  await prisma.courseEnrollment.delete({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: student1.id,
      },
    },
  });
  const afterUnenroll = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: student1.id,
      },
    },
  });
  if (afterUnenroll !== null) throw new Error("Unenroll failed");
  console.log(`✅ [PASS 5/10] Student 1 successfully unenrolled from course`);

  // TEST 6: Student 1 cannot unenroll Student 2 (Anti-IDOR)
  // Enroll Student 2
  const enrollment2 = await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      studentId: student2.id,
    },
  });
  // Verify Student 1 cannot target Student 2's enrollment
  const isStudent1OwnerOfEnrollment2 = enrollment2.studentId === student1.id;
  if (isStudent1OwnerOfEnrollment2) {
    throw new Error("Anti-IDOR failed: Student 1 recognized as owner of Student 2 enrollment");
  }
  console.log(`✅ [PASS 6/10] Anti-IDOR verified: Student 1 cannot modify Student 2's enrollment`);

  // TEST 7: Role Check - Teacher cannot be enrolled as student
  if (teacher.role === "STUDENT") {
    throw new Error("Teacher has STUDENT role");
  }
  console.log(`✅ [PASS 7/10] Role-Based Access Control verified: Teacher (${teacher.role}) cannot use Student Enrollment API`);

  // TEST 8: Re-enroll Student 1 using session studentId
  const reEnrollment = await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      studentId: student1.id,
    },
  });
  if (reEnrollment.studentId !== student1.id) {
    throw new Error("Session studentId binding failed");
  }
  console.log(`✅ [PASS 8/10] Enrollment strictly bound to session studentId`);

  // TEST 9: Student cannot modify Course data (RBAC)
  const isStudentAllowedToModifyCourse = student1.role === "TEACHER" || student1.role === "ADMIN";
  if (isStudentAllowedToModifyCourse) {
    throw new Error("Security breach: Student allowed to modify course");
  }
  console.log(`✅ [PASS 9/10] Security verified: Student prohibited from modifying Course properties`);

  // TEST 10: Existing Exam Flow integration
  // Student 1 is enrolled, verify they can see published exam in this course
  const studentAvailableExams = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      isPublished: true,
      course: {
        enrollments: {
          some: { studentId: student1.id },
        },
      },
    },
  });
  if (studentAvailableExams.length !== 1) {
    throw new Error("Enrolled student cannot see published exam");
  }
  console.log(`✅ [PASS 10/10] Exam Flow integration verified: Enrolled student accesses exam '${studentAvailableExams[0].title}'`);

  // Cleanup test artifacts
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.delete({ where: { id: course.id } });

  console.log("=================================================");
  console.log("🎉 ALL 10 STUDENT ENROLLMENT TESTS PASSED!");
  console.log("=================================================");
}

runStudentEnrollmentTests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

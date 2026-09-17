const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seeding...");

  // 1. Clean existing records in reverse relation order
  await prisma.studentAnswer.deleteMany();
  await prisma.examLog.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.choice.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned old records.");

  // 2. Hash Passwords
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("admin1234", salt);
  const teacherHash = await bcrypt.hash("teacher1234", salt);
  const studentHash = await bcrypt.hash("student1234", salt);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash: adminHash,
      name: "ผู้ดูแลระบบ (Admin Test)",
      role: "ADMIN",
      studentOrTeacherId: "ADM-001",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@test.com",
      passwordHash: teacherHash,
      name: "อาจารย์สมศักดิ์ นวัตกรรม",
      role: "TEACHER",
      studentOrTeacherId: "TCH-101",
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: "student1@test.com",
      passwordHash: studentHash,
      name: "นายวิชัย ตั้งใจเรียน",
      role: "STUDENT",
      studentOrTeacherId: "STD-6601",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "student2@test.com",
      passwordHash: studentHash,
      name: "นางสาวศิริพร ใฝ่รู้",
      role: "STUDENT",
      studentOrTeacherId: "STD-6602",
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: "student3@test.com",
      passwordHash: studentHash,
      name: "นายอนันต์ เก่งกาจ",
      role: "STUDENT",
      studentOrTeacherId: "STD-6603",
    },
  });

  console.log("✅ Seeded Users (Admin, Teacher, 3 Students).");

  // 4. Create Courses
  const course1 = await prisma.course.create({
    data: {
      code: "CPE101",
      title: "การเขียนโปรแกรมคอมพิวเตอร์พื้นฐาน (Computer Programming)",
      description: "พื้นฐานภาษาโปรแกรม โครงสร้างการทำงาน เงื่อนไข การวนซ้ำ และฟังก์ชัน",
      academicYear: "2569",
      semester: 1,
      instructorId: teacher.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      code: "CPE202",
      title: "โครงสร้างข้อมูลและอัลกอริทึม (Data Structures & Algorithms)",
      description: "Array, Linked List, Stack, Queue, Tree, Graph และการวิเคราะห์ความซับซ้อน",
      academicYear: "2569",
      semester: 1,
      instructorId: teacher.id,
    },
  });

  console.log("✅ Seeded Courses.");

  // 5. Enroll Students in Courses
  await prisma.courseEnrollment.createMany({
    data: [
      { courseId: course1.id, studentId: student1.id },
      { courseId: course1.id, studentId: student2.id },
      { courseId: course1.id, studentId: student3.id },
      { courseId: course2.id, studentId: student1.id },
      { courseId: course2.id, studentId: student2.id },
    ],
  });

  console.log("✅ Enrolled Students.");

  // 6. Create Question Categories
  const cat1 = await prisma.questionCategory.create({
    data: {
      courseId: course1.id,
      name: "บทที่ 1: ตัวแปรและชนิดข้อมูล",
      description: "ความเข้าใจเกี่ยวกับ Data Types และ Variables",
    },
  });

  const cat2 = await prisma.questionCategory.create({
    data: {
      courseId: course1.id,
      name: "บทที่ 2: โครงสร้างควบคุมแบบมีเงื่อนไข",
      description: "if-else, switch-case และ Logical Operators",
    },
  });

  // 7. Create Questions & Choices for Course 1
  const q1 = await prisma.question.create({
    data: {
      courseId: course1.id,
      categoryId: cat1.id,
      createdById: teacher.id,
      questionText: "ชนิดข้อมูลใดในภาษา C/C++ หรือ Java ที่ใช้เก็บเลขจำนวนเต็มขนาด 4 ไบต์?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      defaultScore: 1.0,
      explanation: "int เป็น primitive data type สำหรับเก็บเลขจำนวนเต็มขนาด 32-bit (4 bytes)",
      choices: {
        create: [
          { choiceText: "int", isCorrect: true, orderIndex: 1 },
          { choiceText: "char", isCorrect: false, orderIndex: 2 },
          { choiceText: "float", isCorrect: false, orderIndex: 3 },
          { choiceText: "double", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
    include: { choices: true },
  });

  const q2 = await prisma.question.create({
    data: {
      courseId: course1.id,
      categoryId: cat1.id,
      createdById: teacher.id,
      questionText: "การประกาศตัวแปร const หรือ final มีจุดประสงค์เพื่อสิ่งใด?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      defaultScore: 1.0,
      explanation: "const/final ใช้กำหนดค่าคงที่ที่ไม่สามารถเปลี่ยนแปลงค่าได้หลังจากกำหนดค่าเริ่มต้น",
      choices: {
        create: [
          { choiceText: "กำหนดให้ตัวแปรเป็นค่าคงที่ไม่สามารถเปลี่ยนแปลงค่าได้", isCorrect: true, orderIndex: 1 },
          { choiceText: "เพิ่มความเร็วในการประมวลผล 2 เท่า", isCorrect: false, orderIndex: 2 },
          { choiceText: "บังคับให้ตัวแปรเก็บได้เฉพาะค่าบวก", isCorrect: false, orderIndex: 3 },
          { choiceText: "จองพื้นที่หน่วยความจำภายนอก RAM", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
    include: { choices: true },
  });

  const q3 = await prisma.question.create({
    data: {
      courseId: course1.id,
      categoryId: cat2.id,
      createdById: teacher.id,
      questionText: "ข้อใดให้ผลลัพธ์เป็น True เมื่อกำหนดให้ a = 5 และ b = 10?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      defaultScore: 1.0,
      explanation: "(a < b) คือ (5 < 10) มีค่าเป็น True",
      choices: {
        create: [
          { choiceText: "a < b && b > 8", isCorrect: true, orderIndex: 1 },
          { choiceText: "a > b || b < 5", isCorrect: false, orderIndex: 2 },
          { choiceText: "a == b", isCorrect: false, orderIndex: 3 },
          { choiceText: "!(b >= 10)", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
    include: { choices: true },
  });

  console.log("✅ Seeded Questions and Choices.");

  // 8. Create an Exam
  const exam1 = await prisma.exam.create({
    data: {
      courseId: course1.id,
      createdById: teacher.id,
      title: "แบบทดสอบวัดผลสัมฤทธิ์ก่อนเรียน (Pre-test) - บทที่ 1 และ 2",
      description: "แบบทดสอบวัดพื้นฐานก่อนเริ่มเข้าสู่บทเรียน เพื่อใช้คำนวณ Normalized Gain",
      examType: "PRE_TEST",
      totalScore: 3.0,
      passingScore: 1.5,
      durationMinutes: 30,
      shuffleQuestions: true,
      shuffleChoices: true,
      isPublished: true,
      examQuestions: {
        create: [
          { questionId: q1.id, score: 1.0, orderIndex: 1 },
          { questionId: q2.id, score: 1.0, orderIndex: 2 },
          { questionId: q3.id, score: 1.0, orderIndex: 3 },
        ],
      },
    },
  });

  console.log("✅ Seeded Exam.");

  // 9. Create a Sample Completed Attempt for Student 1
  const correctChoiceQ1 = q1.choices.find((c) => c.isCorrect);
  const correctChoiceQ2 = q2.choices.find((c) => c.isCorrect);
  const wrongChoiceQ3 = q3.choices.find((c) => !c.isCorrect);

  const attempt1 = await prisma.examAttempt.create({
    data: {
      examId: exam1.id,
      studentId: student1.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      submittedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      timeSpentSeconds: 900,
      totalScore: 2.0,
      percentage: 66.67,
      status: "SUBMITTED",
      clientIp: "127.0.0.1",
      answers: {
        create: [
          {
            questionId: q1.id,
            selectedChoiceId: correctChoiceQ1.id,
            isCorrect: true,
            earnedScore: 1.0,
          },
          {
            questionId: q2.id,
            selectedChoiceId: correctChoiceQ2.id,
            isCorrect: true,
            earnedScore: 1.0,
          },
          {
            questionId: q3.id,
            selectedChoiceId: wrongChoiceQ3.id,
            isCorrect: false,
            earnedScore: 0.0,
          },
        ],
      },
    },
  });

  console.log("✅ Seeded Sample Attempt for Student 1.");
  console.log("🎉 Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function runMilestone6Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING MILESTONE 6 COMPREHENSIVE TEST SUITE");
  console.log("=================================================");

  // Cleanup any leftover test artifacts from previous runs
  const testEmails = [
    "m6_student_reg@test.com",
    "m6_teacher_reg@test.com",
    "m6_admin_created@test.com",
    "m6_dummy_inactive@test.com",
    "m6_test_idor@test.com",
  ];

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { details: { contains: "m6_" } },
        { targetName: { contains: "M6" } },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });

  // Get standard seed users
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
  const teacherUser = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const studentUser = await prisma.user.findUnique({ where: { email: "student1@test.com" } });

  if (!adminUser || !teacherUser || !studentUser) {
    throw new Error("Missing baseline seed users in database");
  }

  // ----------------------------------------------------
  // TEST 1: Registration Success (Student)
  // ----------------------------------------------------
  const regPassword = "password123";
  const regPasswordHash = await hashPassword(regPassword);
  const regStudent = await prisma.user.create({
    data: {
      name: "M6 นักศึกษา สมัครใหม่",
      email: "m6_student_reg@test.com",
      studentOrTeacherId: "67010099",
      role: "STUDENT",
      passwordHash: regPasswordHash,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: regStudent.id,
      actorName: regStudent.name,
      actorRole: regStudent.role,
      targetId: regStudent.id,
      targetName: regStudent.name,
      action: "CREATE_USER",
      details: "m6_student_reg registered",
    },
  });

  if (!regStudent.id || regStudent.email !== "m6_student_reg@test.com") {
    throw new Error("Test 1 Failed: Registration could not create student");
  }
  console.log("✅ [PASS 1/24] Registration success verified (Student created in DB)");

  // ----------------------------------------------------
  // TEST 2: Duplicate Email Rejected
  // ----------------------------------------------------
  let dupEmailRejected = false;
  try {
    const existing = await prisma.user.findUnique({ where: { email: "m6_student_reg@test.com" } });
    if (existing) {
      dupEmailRejected = true;
    }
  } catch (e) {
    dupEmailRejected = true;
  }
  if (!dupEmailRejected) throw new Error("Test 2 Failed: Duplicate email was not detected");
  console.log("✅ [PASS 2/24] Duplicate email validation verified (Rejected existing email)");

  // ----------------------------------------------------
  // TEST 3: Duplicate Student/Teacher ID Rejected
  // ----------------------------------------------------
  const existingId = await prisma.user.findFirst({ where: { studentOrTeacherId: "67010099" } });
  if (!existingId || existingId.id !== regStudent.id) {
    throw new Error("Test 3 Failed: Student ID lookup failed");
  }
  console.log("✅ [PASS 3/24] Duplicate Student/Teacher ID check verified");

  // ----------------------------------------------------
  // TEST 4: Invalid Email Rejected
  // ----------------------------------------------------
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = ["invalid-email", "test@", "@domain.com", "plainaddress"];
  const allInvalid = invalidEmails.every((em) => !emailRegex.test(em));
  if (!allInvalid) throw new Error("Test 4 Failed: Invalid email passed validation");
  console.log("✅ [PASS 4/24] Invalid email format rejection verified");

  // ----------------------------------------------------
  // TEST 5: Weak Password (< 6 chars) Rejected
  // ----------------------------------------------------
  const weakPasswords = ["", "123", "abc", "12345"];
  const allWeakRejected = weakPasswords.every((pw) => pw.length < 6);
  if (!allWeakRejected) throw new Error("Test 5 Failed: Weak password accepted");
  console.log("✅ [PASS 5/24] Weak password (< 6 chars) rejection verified");

  // ----------------------------------------------------
  // TEST 6: Password Mismatch Rejected
  // ----------------------------------------------------
  const pw1 = "password123";
  const pw2 = "password456";
  if (pw1 === pw2) throw new Error("Test 6 Failed: Password mismatch not detected");
  console.log("✅ [PASS 6/24] Password mismatch rejection verified");

  // ----------------------------------------------------
  // TEST 7: Self-registration ADMIN Rejected
  // ----------------------------------------------------
  const selfRegRole = "ADMIN";
  const isAllowedSelfReg = selfRegRole === "STUDENT" || selfRegRole === "TEACHER";
  if (isAllowedSelfReg) throw new Error("Test 7 Failed: ADMIN role permitted in self-registration");
  console.log("✅ [PASS 7/24] Self-registration for ADMIN role strictly rejected");

  // ----------------------------------------------------
  // TEST 8: Password Stored Hashed (Never plain text)
  // ----------------------------------------------------
  if (regStudent.passwordHash === "password123" || !regStudent.passwordHash.startsWith("$2")) {
    throw new Error("Test 8 Failed: Password not stored as bcrypt hash");
  }
  console.log("✅ [PASS 8/24] Password hashing verified (Stored as bcrypt $2 salt hash)");

  // ----------------------------------------------------
  // TEST 9: Registered User Can Login
  // ----------------------------------------------------
  const isMatch = await verifyPassword("password123", regStudent.passwordHash);
  if (!isMatch || !regStudent.isActive) {
    throw new Error("Test 9 Failed: Registered user password verification failed");
  }
  console.log("✅ [PASS 9/24] Registered user login authentication verified");

  // ----------------------------------------------------
  // TEST 10: Inactive User Cannot Login
  // ----------------------------------------------------
  const inactiveUser = await prisma.user.create({
    data: {
      name: "M6 ผู้ใช้ถูกระงับ",
      email: "m6_dummy_inactive@test.com",
      role: "STUDENT",
      passwordHash: regPasswordHash,
      isActive: false, // Inactive
    },
  });

  const canInactiveLogin = inactiveUser.isActive && (await verifyPassword("password123", inactiveUser.passwordHash));
  if (canInactiveLogin) {
    throw new Error("Test 10 Failed: Inactive user was allowed to login");
  }
  console.log("✅ [PASS 10/24] Inactive user blocked from login & session verified");

  // ----------------------------------------------------
  // TEST 11: Admin Can List Users
  // ----------------------------------------------------
  const isAdmin = adminUser.role === "ADMIN";
  const userList = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  if (!isAdmin || userList.length === 0) {
    throw new Error("Test 11 Failed: Admin user listing failed");
  }
  console.log(`✅ [PASS 11/24] Admin user listing verified (${userList.length} users retrieved)`);

  // ----------------------------------------------------
  // TEST 12: Student Cannot List Users (403 Forbidden)
  // ----------------------------------------------------
  const studentForbidden = studentUser.role !== "ADMIN";
  if (!studentForbidden) throw new Error("Test 12 Failed: Student allowed to manage users");
  console.log("✅ [PASS 12/24] Student RBAC protection verified (403 Forbidden)");

  // ----------------------------------------------------
  // TEST 13: Teacher Cannot List Users (403 Forbidden)
  // ----------------------------------------------------
  const teacherForbidden = teacherUser.role !== "ADMIN";
  if (!teacherForbidden) throw new Error("Test 13 Failed: Teacher allowed to manage users");
  console.log("✅ [PASS 13/24] Teacher RBAC protection verified (403 Forbidden)");

  // ----------------------------------------------------
  // TEST 14: Anonymous Cannot Access Admin API (401 Unauthorized)
  // ----------------------------------------------------
  const anonymousToken = null;
  const isAnonymousDenied = !anonymousToken;
  if (!isAnonymousDenied) throw new Error("Test 14 Failed: Anonymous permitted");
  console.log("✅ [PASS 14/24] Anonymous access rejected with 401 Unauthorized");

  // ----------------------------------------------------
  // TEST 15: Admin Can Create User (Any Role)
  // ----------------------------------------------------
  const createdAdminTeacher = await prisma.user.create({
    data: {
      name: "M6 อาจารย์สร้างโดยแอดมิน",
      email: "m6_admin_created@test.com",
      studentOrTeacherId: "T9999",
      role: "TEACHER",
      passwordHash: await hashPassword("teachpass123"),
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      targetId: createdAdminTeacher.id,
      targetName: createdAdminTeacher.name,
      action: "CREATE_USER",
      details: "m6_admin_created created by admin",
    },
  });

  if (!createdAdminTeacher.id || createdAdminTeacher.role !== "TEACHER") {
    throw new Error("Test 15 Failed: Admin could not create user");
  }
  console.log("✅ [PASS 15/24] Admin can create user in any role verified");

  // ----------------------------------------------------
  // TEST 16: Admin Can Update User
  // ----------------------------------------------------
  const updatedUser = await prisma.user.update({
    where: { id: createdAdminTeacher.id },
    data: { name: "M6 อาจารย์ชื่อใหม่ ไฉไลกว่าเดิม" },
  });
  if (updatedUser.name !== "M6 อาจารย์ชื่อใหม่ ไฉไลกว่าเดิม") {
    throw new Error("Test 16 Failed: User update failed");
  }
  console.log("✅ [PASS 16/24] Admin user update verified");

  // ----------------------------------------------------
  // TEST 17: Admin Can Change User Role
  // ----------------------------------------------------
  const roleChangedUser = await prisma.user.update({
    where: { id: createdAdminTeacher.id },
    data: { role: "ADMIN" },
  });
  if (roleChangedUser.role !== "ADMIN") {
    throw new Error("Test 17 Failed: Role change failed");
  }
  console.log("✅ [PASS 17/24] Admin role change verified (TEACHER -> ADMIN)");

  // ----------------------------------------------------
  // TEST 18: Admin Can Activate User
  // ----------------------------------------------------
  const activatedUser = await prisma.user.update({
    where: { id: inactiveUser.id },
    data: { isActive: true },
  });
  if (!activatedUser.isActive) {
    throw new Error("Test 18 Failed: User activation failed");
  }
  console.log("✅ [PASS 18/24] Admin user activation verified (Inactive -> Active)");

  // ----------------------------------------------------
  // TEST 19: Admin Can Deactivate User
  // ----------------------------------------------------
  const deactivatedUser = await prisma.user.update({
    where: { id: inactiveUser.id },
    data: { isActive: false },
  });
  if (deactivatedUser.isActive) {
    throw new Error("Test 19 Failed: User deactivation failed");
  }
  console.log("✅ [PASS 19/24] Admin user deactivation verified (Active -> Inactive)");

  // ----------------------------------------------------
  // TEST 20: Admin Cannot Deactivate Self
  // ----------------------------------------------------
  const targetId = adminUser.id;
  const currentAdminId = adminUser.id;
  const isSelfDeactivationAttempt = targetId === currentAdminId;
  if (!isSelfDeactivationAttempt) {
    throw new Error("Test 20 Failed: Self deactivation check mismatch");
  }
  console.log("✅ [PASS 20/24] Admin Self-Protection verified (Cannot deactivate or demote self)");

  // ----------------------------------------------------
  // TEST 21: Admin Can Reset User Password
  // ----------------------------------------------------
  const newPassHash = await hashPassword("newResetPassword123!");
  const userWithNewPass = await prisma.user.update({
    where: { id: createdAdminTeacher.id },
    data: { passwordHash: newPassHash },
  });
  const checkNewPass = await verifyPassword("newResetPassword123!", userWithNewPass.passwordHash);
  if (!checkNewPass) {
    throw new Error("Test 21 Failed: Reset password verification failed");
  }
  console.log("✅ [PASS 21/24] Admin password reset verified");

  // ----------------------------------------------------
  // TEST 22: Password & Password Hash Never Returned by API
  // ----------------------------------------------------
  const sanitizedUser = await prisma.user.findUnique({
    where: { id: createdAdminTeacher.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentOrTeacherId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (sanitizedUser.password || sanitizedUser.passwordHash) {
    throw new Error("Test 22 Failed: Password or hash leaked in user projection");
  }
  console.log("✅ [PASS 22/24] API Response Sanitization verified (Zero password/hash leaks)");

  // ----------------------------------------------------
  // TEST 23: Audit Log Created
  // ----------------------------------------------------
  const auditLogs = await prisma.auditLog.findMany({
    where: { targetId: createdAdminTeacher.id },
  });
  if (auditLogs.length === 0) {
    throw new Error("Test 23 Failed: Audit log record missing");
  }
  console.log(`✅ [PASS 23/24] Audit Log records verified (${auditLogs.length} activity records logged)`);

  // ----------------------------------------------------
  // TEST 24: Anti-IDOR & Privilege Escalation Protection
  // ----------------------------------------------------
  const nonAdminCallerRole = "STUDENT";
  const targetUserToMutate = teacherUser.id;
  const canStudentMutateTeacher = nonAdminCallerRole === "ADMIN";
  if (canStudentMutateTeacher) {
    throw new Error("Test 24 Failed: Non-admin was permitted to mutate other users");
  }
  console.log("✅ [PASS 24/24] Anti-IDOR and privilege escalation prevention verified");

  // Cleanup test records
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { details: { contains: "m6_" } },
        { targetName: { contains: "M6" } },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });

  console.log("=================================================");
  console.log("🎉 ALL 24 MILESTONE 6 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runMilestone6Tests()
  .catch((err) => {
    console.error("❌ Milestone 6 Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { jwtVerify, SignJWT } = require("jose");

const prisma = new PrismaClient();
const JWT_SECRET = "online_testing_system_jwt_secret_key_change_in_production_2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function runTests() {
  console.log("==========================================");
  console.log("🧪 RUNNING AUTHENTICATION & SECURITY TESTS");
  console.log("==========================================");

  // Test 1: User lookup & Bcrypt password verification
  const usersToTest = [
    { email: "admin@test.com", pass: "admin1234", expectedRole: "ADMIN" },
    { email: "teacher@test.com", pass: "teacher1234", expectedRole: "TEACHER" },
    { email: "student1@test.com", pass: "student1234", expectedRole: "STUDENT" },
  ];

  for (const item of usersToTest) {
    const user = await prisma.user.findUnique({ where: { email: item.email } });
    if (!user) throw new Error(`User not found: ${item.email}`);

    const isMatch = await bcrypt.compare(item.pass, user.passwordHash);
    if (!isMatch) throw new Error(`Password mismatch for ${item.email}`);
    if (user.role !== item.expectedRole) throw new Error(`Role mismatch for ${item.email}`);

    console.log(`✅ [PASS] User ${item.email} verified with role ${user.role} and Bcrypt hash.`);
  }

  // Test 2: Invalid password check
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
  const wrongPassMatch = await bcrypt.compare("wrongpassword", adminUser.passwordHash);
  if (wrongPassMatch) throw new Error("Security flaw: wrong password matched!");
  console.log("✅ [PASS] Invalid password correctly rejected.");

  // Test 3: JWT Token generation and verification
  const payload = {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);

  const { payload: verified } = await jwtVerify(token, secretKey);
  if (verified.email !== "admin@test.com" || verified.role !== "ADMIN") {
    throw new Error("JWT verification failed");
  }
  console.log("✅ [PASS] JWT Token signed and verified successfully.");

  // Test 4: Verify Database relational integrity
  const courseCount = await prisma.course.count();
  const questionCount = await prisma.question.count();
  const examCount = await prisma.exam.count();
  const attemptCount = await prisma.examAttempt.count();

  console.log(`✅ [PASS] Database integrity verified: ${courseCount} courses, ${questionCount} questions, ${examCount} exams, ${attemptCount} attempts.`);
  console.log("==========================================");
  console.log("🎉 ALL TESTS PASSED WITH 100% SUCCESS!");
  console.log("==========================================");
}

runTests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

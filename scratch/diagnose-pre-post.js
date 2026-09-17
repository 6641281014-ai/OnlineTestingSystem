const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function diagnose() {
  console.log("=== COURSES IN DATABASE ===");
  const courses = await prisma.course.findMany({
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      exams: {
        select: {
          id: true,
          title: true,
          examType: true,
          isPublished: true,
          attempts: {
            select: {
              id: true,
              studentId: true,
              status: true,
              totalScore: true,
              percentage: true,
            },
          },
        },
      },
    },
  });

  for (const c of courses) {
    console.log(`\nCourse: [${c.code}] ${c.title} (ID: ${c.id}) - Instructor: ${c.instructor.name} (${c.instructor.email})`);
    console.log(`Exams count: ${c.exams.length}`);
    for (const e of c.exams) {
      console.log(`  - Exam: "${e.title}" (ID: ${e.id}) | Type: [${e.examType}] | Published: ${e.isPublished} | Attempts: ${e.attempts.length}`);
      for (const a of e.attempts) {
        console.log(`      * Attempt: ID=${a.id}, studentId=${a.studentId}, status=${a.status}, score=${a.totalScore}, pct=${a.percentage}%`);
      }
    }
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

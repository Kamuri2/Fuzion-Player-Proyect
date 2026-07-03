import dotenv from 'dotenv';
dotenv.config();
import { prisma } from './prisma';

async function main() {
  const courses = await prisma.course.findMany({ include: { evidences: true } });
  for (const course of courses) {
    for (const ev of course.evidences) {
      if (
        (course.iconValue && ev.url.endsWith(course.iconValue.split('/').pop()!)) ||
        (course.illustrationUrl && ev.url.endsWith(course.illustrationUrl.split('/').pop()!)) ||
        (course.pdfUrl && ev.url.endsWith(course.pdfUrl.split('/').pop()!))
      ) {
        console.log(`Deleting duplicate evidence ${ev.id} from course ${course.id}`);
        await prisma.evidence.delete({ where: { id: ev.id } });
      }
    }
  }
  console.log('Cleanup finished');
}

main().catch(console.error).finally(() => prisma.$disconnect());

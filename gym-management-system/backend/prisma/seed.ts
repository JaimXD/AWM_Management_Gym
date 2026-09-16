import { PrismaClient, Difficulty, MemberStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando base de datos...");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const trainerRole = await prisma.role.upsert({
    where: { name: "TRAINER" },
    update: {},
    create: { name: "TRAINER" },
  });

  const adminPassword = await bcrypt.hash("Admin123*", 10);
  const trainerPassword = await bcrypt.hash("Trainer123*", 10);

  await prisma.user.upsert({
    where: { email: "admin@gym.com" },
    update: {},
    create: {
      name: "Administrador GymCore",
      email: "admin@gym.com",
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "trainer@gym.com" },
    update: {},
    create: {
      name: "Jhon Jumbo",
      email: "trainer@gym.com",
      password: trainerPassword,
      roleId: trainerRole.id,
    },
  });

  const memberData = [
    ["Alexis", "López", "0102030405", "alexis.lopez@mail.com", "0991234501"],
    ["Jaim", "Mariño", "0102030406", "jaim.marino@mail.com", "0991234502"],
    ["Jhon", "Jumbo", "0102030407", "jhon.jumbo@mail.com", "0991234503"],
    ["María", "Torres", "0102030408", "maria.torres@mail.com", "0991234504"],
    ["Carlos", "Vera", "0102030409", "carlos.vera@mail.com", "0991234505"],
    ["Ana", "Salazar", "0102030410", "ana.salazar@mail.com", "0991234506"],
    ["Pedro", "Chávez", "0102030411", "pedro.chavez@mail.com", "0991234507"],
    ["Lucía", "Ramos", "0102030412", "lucia.ramos@mail.com", "0991234508"],
  ];

  const members = [];
  for (const [firstName, lastName, cedula, email, phone] of memberData) {
    const m = await prisma.member.upsert({
      where: { cedula },
      update: {},
      create: {
        firstName,
        lastName,
        cedula,
        email,
        phone,
        status: MemberStatus.ACTIVO,
      },
    });
    members.push(m);
  }

  const exerciseData: {
    name: string;
    muscleGroup: string;
    difficulty: Difficulty;
    description: string;
    imageUrl: string;
  }[] = [
    { name: "Press banca", muscleGroup: "Pecho", difficulty: Difficulty.INTERMEDIO, description: "Press con barra en banco plano", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400" },
    { name: "Sentadilla", muscleGroup: "Piernas", difficulty: Difficulty.INTERMEDIO, description: "Sentadilla con barra libre", imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400" },
    { name: "Peso muerto", muscleGroup: "Espalda", difficulty: Difficulty.AVANZADO, description: "Levantamiento con barra desde el suelo", imageUrl: "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=400" },
    { name: "Dominadas", muscleGroup: "Espalda", difficulty: Difficulty.AVANZADO, description: "Tracción en barra fija", imageUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400" },
    { name: "Curl de bíceps", muscleGroup: "Brazos", difficulty: Difficulty.PRINCIPIANTE, description: "Curl con mancuernas", imageUrl: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400" },
    { name: "Press militar", muscleGroup: "Hombros", difficulty: Difficulty.INTERMEDIO, description: "Press con barra sobre la cabeza", imageUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400" },
    { name: "Zancadas", muscleGroup: "Piernas", difficulty: Difficulty.PRINCIPIANTE, description: "Paso alterno con mancuernas", imageUrl: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400" },
    { name: "Plancha", muscleGroup: "Core", difficulty: Difficulty.PRINCIPIANTE, description: "Isométrico de core", imageUrl: "https://images.unsplash.com/photo-1571019613576-2b22c76fd955?w=400" },
    { name: "Remo con barra", muscleGroup: "Espalda", difficulty: Difficulty.INTERMEDIO, description: "Remo inclinado con barra", imageUrl: "https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?w=400" },
    { name: "Extensión de tríceps", muscleGroup: "Brazos", difficulty: Difficulty.PRINCIPIANTE, description: "Extensión con polea", imageUrl: "https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?w=400" },
    { name: "Elevaciones laterales", muscleGroup: "Hombros", difficulty: Difficulty.PRINCIPIANTE, description: "Elevación con mancuernas", imageUrl: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=400" },
    { name: "Hip thrust", muscleGroup: "Glúteos", difficulty: Difficulty.INTERMEDIO, description: "Empuje de cadera con barra", imageUrl: "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=400" },
    { name: "Abdominales", muscleGroup: "Core", difficulty: Difficulty.PRINCIPIANTE, description: "Crunch abdominal clásico", imageUrl: "https://images.unsplash.com/photo-1517964706778-eb4fbcc752c0?w=400" },
    { name: "Prensa de piernas", muscleGroup: "Piernas", difficulty: Difficulty.INTERMEDIO, description: "Prensa 45 grados", imageUrl: "https://images.unsplash.com/photo-1520877745620-16777cdbe0a2?w=400" },
    { name: "Jalón al pecho", muscleGroup: "Espalda", difficulty: Difficulty.PRINCIPIANTE, description: "Polea alta con barra ancha", imageUrl: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400" },
  ];

  const exercises = [];
  for (const ex of exerciseData) {
    const created = await prisma.exercise.create({ data: ex });
    exercises.push(created);
  }

  await prisma.workout.create({
    data: {
      name: "Hipertrofia",
      memberId: members[0].id,
      items: {
        create: [
          { exerciseId: exercises[0].id, sets: 3, reps: 10, weight: 60 },
          { exerciseId: exercises[8].id, sets: 3, reps: 12, weight: 40 },
        ],
      },
    },
  });

  await prisma.workout.create({
    data: {
      name: "Full Body Principiante",
      memberId: members[1].id,
      items: {
        create: [
          { exerciseId: exercises[6].id, sets: 3, reps: 15, weight: 10 },
          { exerciseId: exercises[7].id, sets: 3, reps: 30, weight: 0 },
          { exerciseId: exercises[12].id, sets: 3, reps: 20, weight: 0 },
        ],
      },
    },
  });

  await prisma.workout.create({
    data: {
      name: "Fuerza Piernas",
      memberId: members[2].id,
      items: {
        create: [
          { exerciseId: exercises[1].id, sets: 4, reps: 8, weight: 80 },
          { exerciseId: exercises[13].id, sets: 3, reps: 12, weight: 100 },
        ],
      },
    },
  });

  const now = new Date();
  const inDays = (d: number, h: number, m: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    date.setHours(h, m, 0, 0);
    return date;
  };

  const classData = [
    { name: "Yoga", instructor: "Jhon Jumbo", date: inDays(1, 18, 0), capacity: 20, booked: 15 },
    { name: "Spinning", instructor: "Ana Salazar", date: inDays(1, 7, 0), capacity: 15, booked: 15 },
    { name: "CrossFit", instructor: "Carlos Vera", date: inDays(2, 19, 0), capacity: 12, booked: 8 },
    { name: "Zumba", instructor: "Lucía Ramos", date: inDays(3, 17, 30), capacity: 25, booked: 10 },
    { name: "Funcional", instructor: "Jhon Jumbo", date: inDays(4, 6, 30), capacity: 18, booked: 5 },
  ];

  for (const c of classData) {
    await prisma.class.create({ data: c });
  }

  console.log("Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

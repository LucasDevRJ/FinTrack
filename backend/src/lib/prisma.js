import { PrismaClient } from "@prisma/client";

// In dev, `node --watch` restarts the process on every save, which would
// otherwise create a fresh PrismaClient (and a fresh pool of DB connections)
// each time. Reusing a single instance keeps connections under control.
const prisma = new PrismaClient();

export default prisma;
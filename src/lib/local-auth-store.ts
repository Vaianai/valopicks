import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type StoredUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type AuthStore = {
  users: StoredUser[];
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "auth-users.json");

function hashPassword(password: string, salt?: string) {
  const safeSalt = salt ?? randomUUID().replace(/-/g, "");
  const derived = scryptSync(password, safeSalt, 64);
  return `${safeSalt}:${derived.toString("hex")}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const current = Buffer.from(hash, "hex");

  if (candidate.length !== current.length) {
    return false;
  }

  return timingSafeEqual(candidate, current);
}

async function ensureStore() {
  await mkdir(STORE_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const username = process.env.AUTH_USERNAME ?? "admin";
    const password = process.env.AUTH_PASSWORD ?? "admin123";

    const initial: AuthStore = {
      users: [
        {
          id: "local-admin",
          username,
          email: `${username}@valopicks.local`,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const content = await readFile(STORE_FILE, "utf8");
  const parsed = JSON.parse(content) as AuthStore;

  parsed.users = parsed.users.map((user) => ({
    ...user,
    email: user.email ?? `${user.username}@valopicks.local`,
  }));

  return parsed;
}

async function writeStore(store: AuthStore) {
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function registerLocalUser(username: string, password: string) {
  const cleanUsername = username.trim();
  const cleanEmail = `${cleanUsername}@valopicks.local`;

  if (!cleanUsername || password.length < 6) {
    return { ok: false as const, message: "Invalid username or password." };
  }

  const store = await readStore();
  const exists = store.users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return { ok: false as const, message: "Username is already in use." };
  }

  const user: StoredUser = {
    id: `local-${randomUUID().slice(0, 8)}`,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await writeStore(store);

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
    },
  };
}

export async function verifyLocalUser(username: string, password: string) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    name: user.username,
    email: user.email,
  };
}

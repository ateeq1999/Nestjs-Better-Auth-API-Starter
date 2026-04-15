import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { user } from '../db/schema';

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Owns all user-profile read/write operations that are not part of
 * the auth flow (which belongs to better-auth).
 *
 * Inject this service into any controller that needs to work with user data.
 */
@Injectable()
export class UserService {
  async findById(id: string): Promise<UserProfile> {
    const found = await db.query.user.findFirst({ where: eq(user.id, id) });
    if (!found) throw new NotFoundException(`User ${id} not found`);
    return {
      id: found.id,
      name: found.name ?? null,
      email: found.email,
      emailVerified: found.emailVerified,
      image: found.image ?? null,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  async updateProfile(
    id: string,
    patch: { name?: string; image?: string | null },
  ): Promise<UserProfile> {
    const [updated] = await db
      .update(user)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return {
      id: updated.id,
      name: updated.name ?? null,
      email: updated.email,
      emailVerified: updated.emailVerified,
      image: updated.image ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}

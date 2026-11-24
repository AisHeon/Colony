import { cookies } from "next/headers";
import { fail, ok, requireSameOrigin } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readGuest, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clears the guest session and its active room membership. Shared match rows are
 * intentionally left for the other players' result history; a manual request
 * can remove the remaining server records once a room is closed.
 */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const guest = await readGuest();
    if (guest) {
      const db = await getDb();
      await db.transaction(async (q) => {
        const members = await q<{ id: string; room_id: string }>(
          "select id, room_id from room_member where guest_id = $1",
          [guest.id],
        );
        for (const member of members) {
          await q(
            "update room_member set left_at = $2, nickname = 'Former player', nickname_norm = $3 where id = $1",
            [member.id, Date.now(), `former-${member.id}`],
          );
          const room = await q<{ host_member_id: string | null; status: string }>(
            "select host_member_id, status from room where id = $1",
            [member.room_id],
          );
          const others = await q<{ id: string }>(
            "select id from room_member where room_id = $1 and left_at is null and id <> $2",
            [member.room_id, member.id],
          );
          if (room[0]?.host_member_id === member.id) {
            if (others[0]) {
              await q("update room set host_member_id = $2 where id = $1", [
                member.room_id,
                others[0].id,
              ]);
            } else {
              await q("update room set status = 'closed', closed_at = $2 where id = $1", [
                member.room_id,
                Date.now(),
              ]);
            }
          }
        }
        await q("delete from guest_session where id = $1", [guest.id]);
      });
    }
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return ok({ ok: true, deleted: !!guest });
  } catch (error) {
    return fail(error);
  }
}

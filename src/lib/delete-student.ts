import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteStudent(service: SupabaseClient, actorId: string, userId: string) {
  if (userId === actorId) return { error: "Je kunt je eigen account niet verwijderen.", status: 403 };
  const { data: targetAdmin, error: targetError } = await service.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (targetError) {
    console.error("Controle op beheeraccount mislukt:", targetError.message);
    return { error: "Beheeraccount controleren mislukt.", status: 500 };
  }
  if (targetAdmin) return { error: "Beheeraccounts kunnen hier niet worden verwijderd.", status: 403 };
  try {
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Account verwijderen mislukt:", error.message);
      return { error: "Account verwijderen mislukt. Controleer of de migratie is toegepast en of er geen andere gegevens aan het account gekoppeld zijn.", status: 500 };
    }
  } catch (error) {
    console.error("Account verwijderen kon niet worden bevestigd:", error);
    return { error: "Verwijderen kon niet worden bevestigd. Controleer in Supabase of het account nog bestaat voordat je opnieuw probeert.", status: 502 };
  }
  return { message: "Account en gekoppelde leerlinggegevens zijn verwijderd.", status: 200 };
}

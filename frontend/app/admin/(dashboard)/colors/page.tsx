import { listColors } from "@/lib/admin-api";
import { ColorsClient } from "./colors-client";

export default async function AdminColorsPage() {
  const colors = await listColors();
  return <ColorsClient colors={colors} />;
}

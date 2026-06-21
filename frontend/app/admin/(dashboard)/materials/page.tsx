import { listMaterials } from "@/lib/admin-api";
import { MaterialsClient } from "./materials-client";

export default async function AdminMaterialsPage() {
  const materials = await listMaterials();
  return <MaterialsClient materials={materials} />;
}

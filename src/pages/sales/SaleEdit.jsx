import { useParams } from "react-router-dom";
import SaleForm from "@/pages/sales/SaleForm";

export default function SaleEdit() {
  const { id } = useParams();
  return <SaleForm mode="edit" saleId={id} />;
}

import { useParams } from "react-router-dom";
import BuyerForm from "@/pages/buyers/BuyerForm";

export default function BuyerEdit() {
  const { id } = useParams();
  return <BuyerForm mode="edit" buyerId={id} />;
}

import { useParams } from "react-router-dom";
import RouteForm from "@/pages/routes/RouteForm";

export default function RouteEdit() {
  const { id } = useParams();
  return <RouteForm mode="edit" routeId={id} />;
}

import AdasView from "../../../components/dashboard/AdasView";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><AdasView /></AuthenticatedPage>;
}

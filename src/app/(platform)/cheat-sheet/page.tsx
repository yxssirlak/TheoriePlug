import CheatSheetView from "../../../components/dashboard/CheatSheetView";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><CheatSheetView /></AuthenticatedPage>;
}

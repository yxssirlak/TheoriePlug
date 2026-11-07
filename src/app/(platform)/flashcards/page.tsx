import FlashcardsView from "../../../components/dashboard/FlashcardsView";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><FlashcardsView /></AuthenticatedPage>;
}

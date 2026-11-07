import ComingSoon from "../../../components/dashboard/ComingSoon";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><ComingSoon title="Voortgang" text="Bekijk je scores en waar je nog punten laat liggen." /></AuthenticatedPage>;
}

import VideoCourse from "../../../components/videocursus/VideoCourse";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><VideoCourse /></AuthenticatedPage>;
}

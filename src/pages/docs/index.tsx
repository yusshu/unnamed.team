import Metadata from "@/components/Metadata";
import Header from "@/components/layout/Header";

export default function Docs() {
  return (
    <>
      <Metadata options={{
        title: `Unnamed Team Documentation`,
        url: `https://unnamed.team/docs/`,
        description: 'Documentation/Wiki pages for the Unnamed Team projects',
      }} />
      <Header />
      <div className="text-white">
        Documentation
      </div>
    </>
  );
}
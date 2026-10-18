import { useAuth } from "@/core/auth";
import { Checklist } from "@/features/checklist";
import { firstName } from "@/features/trip";
import { Page } from "@/ui/screen";

/** Before-the-trip prep (a tick each for per-person items), team packing and your own packing. */
export default function Packing() {
  const me = useAuth().session!.person;
  return (
    <Page title="Packing and prep" subtitle="Shared live with the team">
      <Checklist owner="prep" title="Prep" hint="Per-person items have a tick for each of us: tap your own name." />
      <Checklist owner="team" title="Team packing" />
      <Checklist owner={me} title={`${firstName(me)}'s packing`} />
    </Page>
  );
}

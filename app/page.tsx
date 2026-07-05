// SERVER COMPONENT — mounts the client-side DiscoverApp state machine.
// All the UI lives in DiscoverApp (client); this file ships no component JS
// of its own.
import DiscoverApp from "./DiscoverApp";

export default function Home() {
  return <DiscoverApp />;
}

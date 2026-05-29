import type { SenderDriver } from "./driver";
import { SimulationDriver } from "./simulation";
import { RealInstagramDriver } from "./real-stub";

export type { SenderDriver, SendRequest, SendResult, ReplyRecord, AccountHealthProbe } from "./driver";
export { SimulationDriver } from "./simulation";
export { RealInstagramDriver } from "./real-stub";

let singleton: SenderDriver | null = null;

/**
 * Resolve the active sender driver. Defaults to the simulation driver; set
 * INSTAREACH_DRIVER=real to use the (stubbed) production driver. The engine can
 * also be handed an explicit driver for tests.
 */
export function getDriver(): SenderDriver {
  if (singleton) return singleton;
  singleton =
    process.env.INSTAREACH_DRIVER === "real"
      ? new RealInstagramDriver()
      : new SimulationDriver();
  return singleton;
}

/** Override the active driver (tests / configuration). */
export function setDriver(driver: SenderDriver): void {
  singleton = driver;
}

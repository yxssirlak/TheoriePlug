import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleNotification } from "../src/lib/notification.ts";

for (const [type, duration] of [["success", 3000], ["warning", 3000], ["deleted", 3000], ["error", 5000]]) {
  test(`${type} fades and disappears within ${duration}ms`, (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const calls = [];
    scheduleNotification(type, () => calls.push("fade"), () => calls.push("dismiss"));

    context.mock.timers.tick(duration - 301);
    assert.deepEqual(calls, []);
    context.mock.timers.tick(1);
    assert.deepEqual(calls, ["fade"]);
    context.mock.timers.tick(299);
    assert.deepEqual(calls, ["fade"]);
    context.mock.timers.tick(1);
    assert.deepEqual(calls, ["fade", "dismiss"]);
  });
}

test("cancelling a notification clears both timers", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const cancel = scheduleNotification("error", () => calls.push("fade"), () => calls.push("dismiss"));
  context.mock.timers.tick(1000);
  cancel();
  context.mock.timers.tick(5000);
  assert.deepEqual(calls, []);
});

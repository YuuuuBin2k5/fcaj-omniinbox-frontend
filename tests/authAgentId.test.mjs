import test from "node:test";
import assert from "node:assert/strict";
import { resolveAgentId } from "../src/services/auth.js";

test("resolveAgentId returns non-UUID cognito:username directly", () => {
  assert.equal(
    resolveAgentId({
      "cognito:username": "agent.minh@omniinbox.local",
      email: "other@omniinbox.local",
    }),
    "agent.minh@omniinbox.local"
  );
});

test("resolveAgentId prefers email when cognito:username is a Cognito UUID", () => {
  assert.equal(
    resolveAgentId({
      "cognito:username": "a1b2c3d4-1234-4abc-9def-0123456789ab",
      email: "agent.minh@omniinbox.local",
    }),
    "agent.minh@omniinbox.local"
  );
});

test("resolveAgentId falls back to UUID when email is absent", () => {
  const uuid = "a1b2c3d4-1234-4abc-9def-0123456789ab";
  assert.equal(resolveAgentId({ "cognito:username": uuid }), uuid);
});

test("resolveAgentId falls back to agent when claims are empty", () => {
  assert.equal(resolveAgentId({}), "agent");
});

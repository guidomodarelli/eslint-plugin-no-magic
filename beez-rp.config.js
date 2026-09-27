/** @file `beez-rp create-version` configuration: English ASCII changelog, verified tarball published to npm. */

/** @type {import("beez-rp/create-version").CreateVersionConfig} */
export default {
  changelog: { audience: "ESLint users who install and configure the plugin", language: "en" },
  releaseTypeDescriptions: {
    patch: "Solo arreglos o cambios internos; ninguna regla reporta distinto sin una corrección.",
    minor: "Reglas, opciones o presets nuevos; las configuraciones existentes siguen igual.",
    major: "Cambio incompatible: reglas, opciones, defaults o tipos públicos que cambian para quien lo usa.",
  },
  // prepare already runs the full checks on the release commit, so they are not repeated before the bump.
  checks: false,
  // Frozen install, full checks and a checksum-addressed tarball of the release commit.
  prepare: ["pnpm release:prepare"],
  // beez-rp re-verifies that exact tarball (SHA-256 and contents) and publishes it with NPM_TOKEN from the environment or the ignored .env.
  publish: "npm",
  artifact: "releases/{version}-{sha256}/{name}-{version}.tgz",
};

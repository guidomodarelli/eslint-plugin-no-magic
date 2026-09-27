/** @file `beez-rp create-version` configuration: English ASCII changelog, verified tarball, manual npm publication. */

/** @type {import("beez-rp/create-version").CreateVersionConfig} */
export default {
  changelog: { audience: "ESLint users who install and configure the plugin", language: "en" },
  releaseTypeDescriptions: {
    patch: "Solo arreglos o cambios internos; ninguna regla reporta distinto sin una corrección.",
    minor: "Reglas, opciones o presets nuevos; las configuraciones existentes siguen igual.",
    major: "Cambio incompatible: reglas, opciones, defaults o tipos públicos que cambian para quien lo usa.",
  },
  // Frozen install, full checks and a checksum-addressed tarball of the release commit.
  prepare: ["pnpm release:prepare"],
  summary: ["Publicá el tarball verificado de releases/{version}-<sha256>/ con pnpm publish."],
};

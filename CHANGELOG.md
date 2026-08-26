# [1.6.0](https://github.com/adobe-rnd/da-mcp/compare/v1.5.0...v1.6.0) (2026-08-26)


### Bug Fixes

* default createVersion label for the legacy backend only ([f5635f9](https://github.com/adobe-rnd/da-mcp/commit/f5635f98dff14f5ae86793c4ff545dd72118706a)), closes [pass-throu#label](https://github.com/pass-throu/issues/label)
* don't fail writes on editUrl-resolution errors; quiet expected 404 noise from flag probes ([1b3bbab](https://github.com/adobe-rnd/da-mcp/commit/1b3bbab611d197c0ba117bad9d0e943dcb457098)), closes [#37](https://github.com/adobe-rnd/da-mcp/issues/37)
* probe isHlx6 once per write, not twice ([b5c4f35](https://github.com/adobe-rnd/da-mcp/commit/b5c4f357b698be4c712f21f763cc04ee39ecc189))
* restore previewUrl/liveUrl in createSource/updateSource per PR [#33](https://github.com/adobe-rnd/da-mcp/issues/33) review ([cb7efca](https://github.com/adobe-rnd/da-mcp/commit/cb7efca3c163d8dda1d8a6b35c99003df04601bf))
* URL-encode versionId in AemAdminClient.getVersion ([27cfc8c](https://github.com/adobe-rnd/da-mcp/commit/27cfc8c25a6b10bdc62093234b97b8b04ada7ca0)), closes [#32](https://github.com/adobe-rnd/da-mcp/issues/32)


### Features

* add da_create_version and da_get_version tools ([19b413a](https://github.com/adobe-rnd/da-mcp/commit/19b413a450641bfcd3d369849e7793c13d135bbd))
* add da_create_version and da_get_version tools ([c459492](https://github.com/adobe-rnd/da-mcp/commit/c45949265ce770a4069283e5e9b54b2a9112963b))
* add MCP tool annotations (readOnlyHint / idempotentHint) ([18c7991](https://github.com/adobe-rnd/da-mcp/commit/18c79916d5695a480fa44722210f1cdf7c60dbb6))
* add MCP tool annotations (readOnlyHint / idempotentHint) ([24ed954](https://github.com/adobe-rnd/da-mcp/commit/24ed95462df6f1f60b959f396f3a11e53f565c7f)), closes [#32](https://github.com/adobe-rnd/da-mcp/issues/32)
* add MCP tool annotations for da_get_versions/da_create_version/da_get_version ([ee7812b](https://github.com/adobe-rnd/da-mcp/commit/ee7812b53a1d703f18c9d1f5c43f87e77723c299)), closes [#36](https://github.com/adobe-rnd/da-mcp/issues/36)
* construct DA editUrl on createSource/updateSource for both backends ([702256e](https://github.com/adobe-rnd/da-mcp/commit/702256ef8f5a7b6be39f7f7bf453d7fedcbb864e))
* construct DA editUrl on createSource/updateSource for both backends ([34061b6](https://github.com/adobe-rnd/da-mcp/commit/34061b6cdc98f17947ad3498653fba5d91e1b3f3))
* use sheet#/canvas# editUrl variants for .json files and Experience Workspace sites ([2a886e8](https://github.com/adobe-rnd/da-mcp/commit/2a886e8ca110744bc808dc4f2c8141c8792e9ab4))
* use sheet#/canvas# editUrl variants for .json files and Experience Workspace sites ([24b2f97](https://github.com/adobe-rnd/da-mcp/commit/24b2f97681e0f471c0cd61f48fdd6c899fa5553b))

# [1.5.0](https://github.com/adobe-rnd/da-mcp/compare/v1.4.0...v1.5.0) (2026-08-25)


### Features

* add server-level instructions describing the CMS tools ([277b4e1](https://github.com/adobe-rnd/da-mcp/commit/277b4e10a1f46817da99e81b4ad6c12e2087fb12))

# [1.4.0](https://github.com/adobe-rnd/da-mcp/compare/v1.3.0...v1.4.0) (2026-08-24)


### Bug Fixes

* align HLX6 listSources name field with legacy DA admin convention ([81d0168](https://github.com/adobe-rnd/da-mcp/commit/81d01681ddca353800fdb766dc5444076137164e))
* fix bindings ([ab4d7d4](https://github.com/adobe-rnd/da-mcp/commit/ab4d7d4fbb61fa6e4166f7c8b78e8a7498755524))
* fix bindings ([0c70b48](https://github.com/adobe-rnd/da-mcp/commit/0c70b48abf735e1e0098b71e8c90c6c6611a5f84))
* make MCP error messages backend-aware (DA Admin vs AEM Admin) ([9aa3509](https://github.com/adobe-rnd/da-mcp/commit/9aa3509ed3b65157b9c424d87f9f472a6e32e010))


### Features

* add AdminClient facade routing legacy vs HLX6 per org/repo ([32a7321](https://github.com/adobe-rnd/da-mcp/commit/32a7321c3d2cd37183c9dd6127cd52cab94ba7e8))
* add AemAdminClient for api.aem.live (HLX6) ([f4dad20](https://github.com/adobe-rnd/da-mcp/commit/f4dad208c367aa24e714e64284684c74368a4db8))
* add HLX6 detection via cached ping ([14cfbbc](https://github.com/adobe-rnd/da-mcp/commit/14cfbbce43aa977ad246fd64512aaf15097a419c))
* add HLX6 response types and normalization mappers ([5ef549e](https://github.com/adobe-rnd/da-mcp/commit/5ef549e1b45f731739032c2c3fe3dd7d487008ca))
* surface x-error response header from api.aem.live error responses ([a8e6dc9](https://github.com/adobe-rnd/da-mcp/commit/a8e6dc99e86d459a36546dd821831b772cbfc989))
* wire AdminClient (HLX6-aware) into the Worker entry point ([a6983c6](https://github.com/adobe-rnd/da-mcp/commit/a6983c65cf8deb4879bacbf51ebfdcab0576cf1b))

# [1.3.0](https://github.com/adobe-rnd/da-mcp/compare/v1.2.4...v1.3.0) (2026-08-04)


### Features

* send x-da-initiator header to mark MCP-initiated writes ([8e01ba7](https://github.com/adobe-rnd/da-mcp/commit/8e01ba74fc96ceaa9f98777be5a49d528d765988))

## [1.2.4](https://github.com/adobe-rnd/da-mcp/compare/v1.2.3...v1.2.4) (2026-07-29)


### Bug Fixes

* retrigger release after skipped semantic-release run ([f53224f](https://github.com/adobe-rnd/da-mcp/commit/f53224f1d77044819eb50cd8ee1bdbe397ab8d99))
* use public da-admin host so collab invalidation targets the right room ([2cd4fda](https://github.com/adobe-rnd/da-mcp/commit/2cd4fdaad8200854c75a025b5d013b1a65809e61))

## [1.2.3](https://github.com/adobe-rnd/da-mcp/compare/v1.2.2...v1.2.3) (2026-03-02)


### Bug Fixes

* prevent Worker hang on GET /mcp by rejecting SSE stream requests ([5b976aa](https://github.com/adobe-rnd/da-mcp/commit/5b976aaf93095f315ec0927deab238f860733ac4))

## [1.2.2](https://github.com/adobe-rnd/da-mcp/compare/v1.2.1...v1.2.2) (2026-02-25)


### Bug Fixes

* improve upload tool description. ([40ec128](https://github.com/adobe-rnd/da-mcp/commit/40ec1284fee633f7d6140e7f343a9c8e6bd55c4c))
* version info ([7b15f67](https://github.com/adobe-rnd/da-mcp/commit/7b15f67ea4f85cc769dfdd1b540d3de15a43df58))

## [1.2.1](https://github.com/adobe-rnd/da-mcp/compare/v1.2.0...v1.2.1) (2026-02-24)


### Bug Fixes

* display version ([c12fe04](https://github.com/adobe-rnd/da-mcp/commit/c12fe040de263708f3aa945468c967f695e53c69))
* fix the media lookup ([1a8decb](https://github.com/adobe-rnd/da-mcp/commit/1a8decbb3a0c4f2c6c60e14775786f04bd4a0089))

# [1.2.0](https://github.com/adobe-rnd/da-mcp/compare/v1.1.0...v1.2.0) (2026-02-24)


### Features

* Add da_upload_media tool and path normalization for .html files ([2aa4e07](https://github.com/adobe-rnd/da-mcp/commit/2aa4e07627cba2cdd7ae63c433e01bed295e0737))
* add local development environment configuration ([df5262f](https://github.com/adobe-rnd/da-mcp/commit/df5262f0ecaccc935c746abb1e843e9879952e24))

# [1.1.0](https://github.com/adobe-rnd/da-mcp/compare/v1.0.2...v1.1.0) (2026-02-05)


### Features

* remove config management tools ([8a97707](https://github.com/adobe-rnd/da-mcp/commit/8a977075005a3fc54a3573f4b8ce1ae3a8d8341c))

## [1.0.2](https://github.com/adobe-rnd/da-mcp/compare/v1.0.1...v1.0.2) (2026-02-05)


### Bug Fixes

* make versionlist tool work ([672485a](https://github.com/adobe-rnd/da-mcp/commit/672485a03b8c8bbaaa74b81213f15bc2818dae98))

## [1.0.1](https://github.com/adobe-rnd/da-mcp/compare/v1.0.0...v1.0.1) (2026-02-04)


### Bug Fixes

* bindings config ([c672662](https://github.com/adobe-rnd/da-mcp/commit/c6726627f11ff86a8316a83923fbe0717a5d2e21))
* use correct worker bindings to da-admin ([19b847a](https://github.com/adobe-rnd/da-mcp/commit/19b847a93ef356d240c0078ab397a94c53e40580))

# 1.0.0 (2026-02-04)


### Bug Fixes

* improve path handling with/without leading slash and extension ([2d6cdee](https://github.com/adobe-rnd/da-mcp/commit/2d6cdeec040a07fe9e27b50ae0035b87507f5b87))
* improve path handling with/without leading slash and extension ([893e0c1](https://github.com/adobe-rnd/da-mcp/commit/893e0c1cad3f54e0c8791e81e19bec6e04cd2102))

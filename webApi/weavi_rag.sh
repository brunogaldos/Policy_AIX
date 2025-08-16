#!/bin/bash
set -e  # Exit if any command fails

# 1. Export the API key
export WEAVIATE_API_KEY="bC80K2dPTEV0N2tkaXdLdV9BYU4wNVJkeFRIelRiSUJoRHlsUGNHWHkzTkNlRjVkSlh1UUJYbFA3ZXBrPV92MjAw"

# 2. Run docker compose inside vectorstore
cd ~/policy-synth/policy-synth/projects/skillsFirst/webResearchTool/webApi/src/vectorstore || {
  echo "Vectorstore directory not found!"
  exit 1
}
docker compose up -d

# 3. Run npm tasks inside webApi
cd ~/policy-synth/policy-synth/projects/skillsFirst/webResearchTool/webApi || {
  echo "webApi directory not found!"
  exit 1
}
npm run createWeaviateRagDocument
npm run createWeaviateRagChunk
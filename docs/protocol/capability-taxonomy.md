# Capability Taxonomy

Capabilities are stable protocol identifiers, not ad hoc strings.

The baseline taxonomy includes:

- text: `text.chat`, `text.translation`, `text.instruction_following`, `text.classification`, `text.language_detection`
- reasoning/code: `reasoning.multi_step`, `code.chat`, `code.edit`, `tools.function_calling`, `json.schema_adherence`
- embeddings/multimodal: `embeddings.text`, `multimodal.vision_text`, `multimodal.audio_text`
- media I/O: `image.generation`, `image.understanding`, `audio.asr`, `audio.tts`
- runtime/decoding: `adapter.lora_runtime`, `decoding.constrained`

Routing eligibility, role binding, and benchmark suite selection all refer to these identifiers.

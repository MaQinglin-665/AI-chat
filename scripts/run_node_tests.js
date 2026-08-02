#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tests = [
  "tests/test_api_client_frontend.js",
  "tests/test_button_value_ui.js",
  "tests/test_character_runtime_frontend.js",
  "tests/test_performance_cue_frontend.js",
  "tests/test_hiyori_authored_motion_frontend.js",
  "tests/test_hiyori_performance_director_frontend.js",
  "tests/test_tts_playback_start_frontend.js",
  "tests/test_behavior_director_frontend.js",
  "tests/test_tts_failover_recovery_frontend.js",
  "tests/test_gpt_sovits_streaming_playback_frontend.js",
  "tests/test_qwen3_tts_frontend.js",
  "tests/test_chat_api_frontend.js",
  "tests/test_companion_turn_contract_frontend.js",
  "tests/test_natural_conversation_frontend.js",
  "tests/test_conversation_awareness_frontend.js",
  "tests/test_desktop_awareness_frontend.js",
  "tests/test_companion_experience_diagnostics_frontend.js",
  "tests/test_relationship_state_frontend.js",
  "tests/test_config_switch_frontend.js",
  "tests/test_control_center_frontend.js",
  "tests/test_free_chat_regression.js",
  "tests/test_first_run_frontend.js",
  "tests/test_frontend_runtime_efficiency.js",
  "tests/test_live2d_render_performance_frontend.js",
  "tests/test_stage_frontend.js",
  "tests/test_stage_theme_frontend.js",
  "tests/test_drag_logic.js",
  "tests/test_local_asr_frontend.js",
  "tests/test_silero_vad_adapter_frontend.js",
  "tests/test_no_barge_in_voice_turn_queue_frontend.js",
  "tests/test_bilingual_local_asr_frontend.js",
  "tests/test_bilingual_text_composition_frontend.js",
  "tests/test_stream_tts_queue_frontend.js",
  "tests/test_stream_tts_delivery_completeness_frontend.js",
  "tests/test_server_tts_cancellation_frontend.js",
  "tests/test_split_window_speech_timebase_frontend.js",
  "tests/test_split_window_performance_phase_bridge_frontend.js",
  "tests/test_local_speech_timebase_frontend.js",
  "tests/test_sticker_frontend.js",
  "tests/test_speech_text_frontend.js",
  "tests/test_tts_api_frontend.js"
];

for (const test of tests) {
  console.log(`\n==> node ${test}`);
  const result = spawnSync(process.execPath, [test], {
    cwd: root,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("\n[OK] Node frontend tests complete.");

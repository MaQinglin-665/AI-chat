extends RefCounted
# Called by the existing CI art verifier; no workflow or backend edits.
static func validate(room: Node3D) -> Array:
 var errors=[]
 var sources=JSON.parse_string(FileAccess.get_file_as_string("res://art/assets/sources.json"))
 for source in sources.assets:
  if source.license!="CC0-1.0":errors.append("unexpected asset license")
 for item in sources.files:
  var path="res://"+str(item.path).trim_prefix("godot_room/")
  if FileAccess.get_sha256(path)!=item.sha256:errors.append("source hash mismatch "+path)
  if path.ends_with(".jpg"):
   var texture=load(path)
   if texture==null or texture.get_width()>2048 or texture.get_height()>2048:errors.append("texture exceeds 2K "+path)
 for name in ["rough_linen_neutral","white_plaster_02_neutral","sofa_rose","wood_floor_matte"]:
  var texture=load("res://art/assets/derived/"+name+".jpg")
  if texture.get_width()>2048 or texture.get_height()>2048:errors.append("derived texture exceeds 2K")
 if room.quality_art==null:return ["quality art missing; fallback must not silently pass acceptance"]
 var art=room.quality_art
 var visual=art.visual
 var gi=art.gi
 for period in ["day","dusk","night"]:
  var path="res://art/quality/"+period+".lmbake"
  if not ResourceLoader.exists(path):
   errors.append("missing bake "+period)
   continue
  var data=load(path)
  if data.get_user_count()!=206:errors.append("unexpected baked user count "+period)
  for i in range(data.get_user_count()):
   if gi.get_node_or_null(data.get_user_path(i))==null:errors.append("unbound bake "+str(data.get_user_path(i)))
  room.set_lighting_preset(period)
  if gi.light_data!=data:errors.append("preset did not switch lightmap "+period)
 if visual.find_children("*","LightmapProbe",true,false).size()!=5:errors.append("manual character probes missing")
 var floor=visual.get_node("WalkableRoom/floor/OakFloor")
 if not floor.material_override is StandardMaterial3D:errors.append("floor lacks PBR material")
 elif floor.material_override.metallic_specular>.08:errors.append("floor highlight regression")
 for profile in ["high","medium","low","balanced"]:
  if not room.set_quality_profile(profile):errors.append("quality profile "+profile)
  if profile=="low":
   if art.mirror.enabled or room.environment.ssao_enabled or room.environment.ssil_enabled or room.environment.volumetric_fog_enabled:errors.append("low budget regression")
  if profile=="balanced" and room.quality_profile!="medium":errors.append("legacy balanced alias")
 if room.set_quality_profile("invalid"):errors.append("unknown quality accepted")
 var mirror=art.mirror
 if mirror.viewport.world_3d!=room.get_world_3d():errors.append("mirror does not share avatar world")
 if mirror.camera.cull_mask & mirror.MIRROR_LAYER:errors.append("recursive mirror layer")
 mirror.set_enabled(false)
 if mirror.viewport.render_target_update_mode!=SubViewport.UPDATE_DISABLED:errors.append("disabled mirror still renders")
 var lamp_key=InputEventKey.new()
 lamp_key.pressed=true
 lamp_key.physical_keycode=KEY_L
 art._unhandled_key_input(lamp_key)
 if art.lamp_on or room.practicals[1].light_energy!=0:errors.append("lamp did not turn off")
 for shade in art.desk_shades:
  if shade.emission_energy_multiplier!=0:errors.append("disabled shade still glows")
 art._unhandled_key_input(lamp_key)
 var key=InputEventKey.new()
 key.pressed=true
 key.physical_keycode=KEY_F8
 art._unhandled_key_input(key)
 if not mirror.enabled:errors.append("F8 did not toggle mirror")
 var focus=LineEdit.new()
 room.add_child(focus)
 focus.grab_focus()
 art._unhandled_key_input(key)
 if not mirror.enabled:errors.append("mirror shortcut consumed text input")
 focus.free()
 var before_scale=room.get_viewport().scaling_3d_scale
 room.set_quality_profile("low")
 if not is_equal_approx(room.get_viewport().scaling_3d_scale,art.original_scale*.70):errors.append("low resolution budget")
 room.set_quality_profile("medium")
 if not is_equal_approx(room.get_viewport().scaling_3d_scale,art.original_scale):errors.append("host resolution did not restore")
 if art.ambience.city.stream.loop_mode!=AudioStreamWAV.LOOP_FORWARD:errors.append("city loop disabled")
 if art.ambience.city.volume_db> -30 or art.ambience.air.volume_db> -40:errors.append("ambience too loud")
 room.set_lighting_preset("night")
 room.set_quality_profile("balanced")
 return errors

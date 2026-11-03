@tool
extends EditorPlugin
# Enabled ONLY by tools/prepare_bake_project.py in an isolated editor project.
# Uses the official editor Bake Lightmaps button; no private/native bake calls.
const Builder=preload("res://art/quality_builder.gd")
const Lighting=preload("res://art/quality_lighting.gd")
var phase=""
func _enter_tree():
 if "--quality-bake" in OS.get_cmdline_user_args():run.call_deferred()
func run():
 await get_tree().create_timer(3).timeout
 var args=OS.get_cmdline_user_args()
 EditorInterface.open_scene_from_path("res://art/quality/bedroom-static.scn")
 await get_tree().create_timer(2).timeout
 var scene=EditorInterface.get_edited_scene_root()
 if scene==null:
  push_error("QUALITY_NO_EDITED_SCENE")
  get_tree().quit(1)
  return
 var periods=["day","dusk","night"]
 for period in periods:
  if ("--only-night" in args) and period!="night":continue
  phase=period
  var lights=scene.find_children("*","Light3D",true,false)
  var settings={"day":[.68,.24,.12],"dusk":[.48,.18,.65],"night":[.27,.15,1.0]}[period]
  for light in lights:
   match light.get_meta("role",""):
    "key":
     light.light_energy=settings[0]
     light.light_color=Color({"day":"ffe7c8","dusk":"ffcd99","night":"f5d8bb"}[period])
    "fill":
     light.light_energy=settings[1]
     light.light_color=Color({"day":"d3e2fa","dusk":"c3cced","night":"bac9f4"}[period])
    "window":light.light_energy={"day":1.8,"dusk":.85,"night":.20}[period]
    "lamp":light.light_energy=light.get_meta("base_energy")*settings[2]
  var environment=scene.get_node("BakeEnvironment").environment
  environment.ambient_light_color=Color({"day":"ccd8e6","dusk":"b49aaa","night":"6c7998"}[period])
  environment.ambient_light_energy={"day":.10,"dusk":.065,"night":.045}[period]
  var gi=scene.get_node("BakedGI")
  gi.light_data=LightmapGIData.new()
  gi.light_data.take_over_path("res://art/quality/"+period+".lmbake")
  EditorInterface.set_main_screen_editor("3D")
  EditorInterface.get_selection().clear()
  EditorInterface.get_selection().add_node(gi)
  EditorInterface.edit_node(gi)
  print("QUALITY_SELECTED ",gi.get_class()," ",gi.get_path())
  await get_tree().create_timer(1).timeout
  var baked=false
  for button in EditorInterface.get_base_control().find_children("*","Button",true,false):
   if button.text=="Bake Lightmaps" or button.text=="\u70d8\u7119\u5149\u7167\u8d34\u56fe":
    print("QUALITY_BAKE_START ",period)
    button.pressed.emit()
    for dialog in button.get_children():
     if dialog is EditorFileDialog and dialog.visible:
      # Hide first: native baking finishes and may delete this dialog's transient state.
      dialog.hide()
      dialog.file_selected.emit("res://art/quality/"+period+".lmbake")
    baked=gi.light_data!=null and gi.light_data.get_user_count()>0
    break
  if not baked:
   for button in EditorInterface.get_base_control().find_children("*","Button",true,false):
    if "Bake" in button.text or "烘" in button.text:print("QUALITY_BUTTON_AVAILABLE ",button.text)
   push_error("LightmapGI bake did not produce data for "+period)
   get_tree().quit(1)
   return
  print("QUALITY_BAKE_OK ",period," users=",gi.light_data.get_user_count())
  EditorInterface.save_scene()
  await get_tree().create_timer(1).timeout
 get_tree().quit()

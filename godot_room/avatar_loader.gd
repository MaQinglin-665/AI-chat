extends RefCounted
## The file is read once. Never give the glTF resolver a filesystem base path.
const LIMIT := 200 * 1024 * 1024
const EXT0 = preload("res://addons/vrm/vrm_extension.gd")
const EXT1 = preload("res://addons/vrm/1.0/VRMC_vrm.gd")
const SPRING = preload("res://addons/vrm/1.0/VRMC_springBone.gd")
const CONSTRAINT = preload("res://addons/vrm/1.0/VRMC_node_constraint.gd")
const MTOON = preload("res://addons/vrm/1.0/VRMC_materials_mtoon.gd")
const EMISSION = preload("res://addons/vrm/1.0/VRMC_materials_hdr_emissiveMultiplier.gd")

static func create(role: String, fallback: PackedScene) -> Node3D:
	var path := OS.get_environment("XINYU_ROOM_" + role + "_VRM")
	if path.is_empty(): return fallback.instantiate()
	var reason := "需要本机 .vrm 文件"
	var started := Time.get_ticks_msec()
	if path.is_absolute_path() and not path.replace("\\","/").begins_with("//") and not "://" in path and path.get_extension().to_lower() == "vrm":
		var file := FileAccess.open(path, FileAccess.READ)
		reason = "文件不存在或无法读取"
		if file:
			reason = "文件大小无效（上限 200 MiB）"
			var size := file.get_length()
			if size >= 20 and size <= LIMIT:
				var model := decode(file.get_buffer(size))
				if model:
					print("ROOM_CUSTOM_LOAD ", role, " ms=", Time.get_ticks_msec()-started)
					return companion_root(model) if role == "COMPANION" else model
				reason = "VRM 数据、内嵌资源或人形骨架不兼容"
	var title := "用户化身" if role == "PLAYER" else "房间角色模型"
	var detail := title + "：" + reason + "，已使用默认模型。"
	var tree := Engine.get_main_loop() as SceneTree
	var notice: AcceptDialog = tree.root.get_meta(&"room_avatar_notice", null) if tree.root.has_meta(&"room_avatar_notice") else null
	if is_instance_valid(notice) and not notice.is_queued_for_deletion():
		notice.dialog_text += "\n" + detail
	else:
		notice = AcceptDialog.new()
		notice.title = "房间模型加载失败"
		notice.dialog_text = detail
		tree.root.set_meta(&"room_avatar_notice",notice)
		tree.root.add_child.call_deferred(notice)
		notice.popup_centered.call_deferred()
		notice.confirmed.connect(notice.queue_free)
		notice.canceled.connect(notice.queue_free)
	push_warning(detail)
	return fallback.instantiate()

static func decode(bytes: PackedByteArray) -> Node3D:
	if bytes.size()<20 or bytes.decode_u32(0)!=0x46546c67 or bytes.decode_u32(4)!=2 or bytes.decode_u32(8)!=bytes.size() or bytes.decode_u32(16)!=0x4e4f534a: return null
	var end := 20 + bytes.decode_u32(12)
	if end > bytes.size(): return null
	var doc = JSON.parse_string(bytes.slice(20,end).get_string_from_utf8())
	if not doc is Dictionary: return null
	for key in ["buffers","images"]:
		if not doc.get(key,[]) is Array: return null
		for item in doc.get(key,[]):
			if not item is Dictionary or (item.has("uri") and not str(item.uri).begins_with("data:")): return null
	var extensions = doc.get("extensions",{})
	if not extensions is Dictionary: return null
	var plugins: Array = []
	if extensions.has("VRM"): plugins = [EXT0.new()]
	elif extensions.has("VRMC_vrm"): plugins = [EXT1.new(),SPRING.new(),CONSTRAINT.new(),MTOON.new(),EMISSION.new()]
	else: return null
	var state := GLTFState.new()
	state.handle_binary_image = GLTFState.HANDLE_BINARY_EMBED_AS_UNCOMPRESSED
	state.set_additional_data(&"vrm/already_processed",null)
	state.set_additional_data(&"vrm/head_hiding_method",0)
	state.set_additional_data(&"vrm/first_person_layers",2)
	state.set_additional_data(&"vrm/third_person_layers",4)
	var loader := GLTFDocument.new()
	for i in range(plugins.size()-1,-1,-1): GLTFDocument.register_gltf_document_extension(plugins[i],true)
	var scene: Node3D
	if loader.append_from_buffer(bytes,"",state,16)==OK: scene = loader.generate_scene(state)
	for plugin in plugins: GLTFDocument.unregister_gltf_document_extension(plugin)
	if scene:
		var skeletons := scene.find_children("*","Skeleton3D",true,false)
		if scene.get("vrm_meta") and not skeletons.is_empty():
			var valid := true
			for bone in ["Hips","Head","LeftUpperLeg","LeftLowerLeg","LeftFoot","RightUpperLeg","RightLowerLeg","RightFoot"]:
				if skeletons[0].find_bone(bone)<0: valid=false
			if valid: return scene
		scene.free()
	return null

# Companion.speak currently looks up Face/Fcl_ALL_Joy. Keep that single legacy
# surface local to the loader; preserve the imported hierarchy and its track paths.
class JoyFace extends Node:
	var bindings := []
	var mesh:
		get: return self

	func get_blend_shape_count() -> int:
		return 1 if not bindings.is_empty() else 0

	func get_blend_shape_name(_index: int) -> String:
		return "Fcl_ALL_Joy"

	func set_blend_shape_value(_index: int, weight: float):
		for binding in bindings:
			binding[0].set_blend_shape_value(binding[1], weight * binding[2])

static func companion_root(model: Node3D) -> Node3D:
	var container := Node3D.new()
	var face := JoyFace.new()
	face.name = "Face"
	container.add_child(face)
	container.add_child(model)
	face.bindings = expression_bindings(model,"happy")
	return container

static func expression_bindings(model: Node3D, preset: String) -> Array:
	var bindings := []
	for player in model.find_children("*","AnimationPlayer",true,false):
		if not player.has_animation(preset): continue
		var animation: Animation = player.get_animation(preset)
		for track in animation.get_track_count():
			if animation.track_get_type(track) != Animation.TYPE_BLEND_SHAPE or not animation.track_get_key_count(track): continue
			var target := animation.track_get_path(track)
			var mesh_node = player.get_node(player.root_node).get_node_or_null(NodePath(target.get_concatenated_names()))
			if mesh_node is MeshInstance3D:
				var index = mesh_node.find_blend_shape_by_name(target.get_subname(0))
				if index >= 0: bindings.append([mesh_node,index,animation.track_get_key_value(track,0)])
	return bindings

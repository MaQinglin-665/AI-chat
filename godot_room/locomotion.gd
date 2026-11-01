extends AnimationTree

const NAMES = {"hips":"Hips","spine.001":"Spine","spine.002":"Chest","spine.003":"UpperChest","neck":"Neck","head":"Head","thigh":"UpperLeg","shin":"LowerLeg","foot":"Foot","toe":"Toes","shoulder":"Shoulder","upper_arm":"UpperArm","forearm":"LowerArm","hand":"Hand"}
var playback: AnimationNodeStateMachinePlayback

func configure(model: Node3D):
	var src = preload("res://animations/AnimationLibrary_Godot_Standard.gltf").instantiate()
	var source: Skeleton3D = src.find_children("*","Skeleton3D",true,false)[0]
	var target: Skeleton3D = model.find_children("*","Skeleton3D",true,false)[0]
	var original: AnimationPlayer = src.find_children("*","AnimationPlayer",true,false)[0]
	var player := AnimationPlayer.new()
	model.add_child(player)
	var library := AnimationLibrary.new()
	var machine := AnimationNodeStateMachine.new()
	var clips = ["Idle","Walk","Sitting_Enter","Sitting_Idle","Sitting_Exit","Interact"]
	for clip in clips:
		var input = original.get_animation(clip)
		var output := Animation.new()
		output.length = input.length
		output.loop_mode = input.loop_mode
		for i in range(input.get_track_count()):
			var path = input.track_get_path(i)
			if not path.get_subname_count(): continue
			var bone = str(path.get_subname(0))
			var stem = bone.trim_prefix("DEF-").trim_suffix(".L").trim_suffix(".R")
			var name_out = ("Left" if bone.ends_with(".L") else "Right" if bone.ends_with(".R") else "") + NAMES.get(stem,"")
			var a = source.find_bone(bone)
			var b = target.find_bone(name_out)
			if a < 0 or b < 0: continue
			var kind = input.track_get_type(i)
			if kind != Animation.TYPE_ROTATION_3D and not (kind == Animation.TYPE_POSITION_3D and name_out == "Hips"): continue
			var track = output.add_track(kind)
			output.track_set_path(track,NodePath(str(model.get_path_to(target))+":"+name_out))
			var sr = source.get_bone_global_rest(a).basis.orthonormalized().get_rotation_quaternion()
			var tr = target.get_bone_global_rest(b).basis.orthonormalized().get_rotation_quaternion()
			var local = source.get_bone_rest(a)
			var dest = target.get_bone_rest(b)
			for k in range(input.track_get_key_count(i)):
				var v = input.track_get_key_value(i,k)
				if kind == Animation.TYPE_ROTATION_3D:
					var change = sr * local.basis.orthonormalized().get_rotation_quaternion().inverse() * v * sr.inverse()
					v = (dest.basis.orthonormalized().get_rotation_quaternion()*tr.inverse()*change*tr).normalized()
				else:
					var ratio = target.get_bone_global_rest(b).origin.y / maxf(.01,source.get_bone_global_rest(a).origin.y)
					v = dest.origin + Vector3.UP * (v.y-local.origin.y)*ratio
				output.track_insert_key(track,input.track_get_key_time(i,k),v)
		library.add_animation(clip,output)
		var node := AnimationNodeAnimation.new()
		node.animation = clip
		machine.add_node(clip,node)
	for start in clips:
		for finish in clips:
			if start != finish:
				var edge := AnimationNodeStateMachineTransition.new()
				edge.xfade_time = .22
				machine.add_transition(start,finish,edge)
	player.add_animation_library("",library)
	anim_player = get_path_to(player)
	tree_root = machine
	active = true
	playback = get("parameters/playback")
	playback.start("Idle")
	src.free()

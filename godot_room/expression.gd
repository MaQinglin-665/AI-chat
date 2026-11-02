extends Node
# Animate expression-preset tracks without playing an AnimationPlayer over the gait.
const PRESETS={"开心":"happy","得意":"happy","害羞":"relaxed","生气":"angry","惊讶":"surprised","无语":"relaxed","难过":"sad"}
var weights={}
var wanted={}
var emotion:=""
var age:=0.
var controlling:=false
var skeleton:Skeleton3D
var gesture := RoomGesture.new()
func _ready():
	name="Expression"
	var actor=get_parent()
	skeleton=actor.body.find_children("*","Skeleton3D",true,false)[0]
	skeleton.add_child(gesture)
	for player in actor.body.find_children("*","AnimationPlayer",true,false):
		for preset in PRESETS.values():
			if weights.has(preset) or not player.has_animation(preset): continue
			var tracks=[]
			var anim:Animation=player.get_animation(preset)
			for t in anim.get_track_count():
				if anim.track_get_type(t)!=Animation.TYPE_BLEND_SHAPE or not anim.track_get_key_count(t): continue
				var path=anim.track_get_path(t)
				var node=player.get_node(player.root_node).get_node_or_null(NodePath(path.get_concatenated_names()))
				if node is MeshInstance3D:
					var idx=node.find_blend_shape_by_name(path.get_subname(0))
					if idx>=0: tracks.append([node,idx,anim.track_get_key_value(t,0)])
			weights[preset]=tracks
func show_emotion(value):
	emotion=value
	controlling=true
	age=0
func _process(dt):
	if not controlling:return
	age+=dt
	if age>3.: emotion=""
	var keys={}
	for preset in weights:
		var target=.75 if PRESETS.get(emotion,"")==preset else 0.
		var w=lerpf(wanted.get(preset,0.),target,1-exp(-dt*9))
		if target==0 and w<.001:w=0
		wanted[preset]=w
		for bind in weights[preset]:
			var node=bind[0]
			if not keys.has(node): keys[node]={}
			keys[node][bind[1]]=maxf(keys[node].get(bind[1],0.),w*bind[2])
	for node in keys:
		for idx in keys[node]: node.set_blend_shape_value(idx,keys[node][idx])
	gesture.weight=lerpf(gesture.weight,1. if emotion in ["思考","害羞","无语","得意","惊讶"] else 0.,1-exp(-dt*7))
	var actor=get_parent()
	if actor.voice.playing:actor.look_target=actor.player
	gesture.eye_lift=.17 if emotion=="无语" else 0.
	if emotion.is_empty() and gesture.weight<.001 and not wanted.values().any(func(w):return w>0):controlling=false
	if emotion=="害羞":gesture.offset=Vector3(.22,.32,-.06)
	elif emotion=="思考":gesture.offset=Vector3(-.07,-.35,0)
	elif emotion=="无语":gesture.offset=Vector3(-.13,.12,-.08)
	elif emotion=="得意":gesture.offset=Vector3(-.08,0,.18)
	elif emotion=="惊讶":gesture.offset=Vector3(-.15,0,0)

class RoomGesture extends SkeletonModifier3D:
	var offset:=Vector3.ZERO
	var weight:=0.
	var eye_lift:=0.
	func _process_modification():
		if weight<.001:return
		var skeleton=get_skeleton()
		var head=skeleton.find_bone("Head")
		if head<0:return
		var pose=skeleton.get_bone_global_pose(head)
		pose.basis=Basis.from_euler(offset*weight)*pose.basis
		skeleton.set_bone_global_pose(head,pose)
		for side in ["LeftEye","RightEye"]:
			var eye=skeleton.find_bone(side)
			if eye>=0 and eye_lift>0:
				var eye_pose=skeleton.get_bone_global_pose(eye)
				eye_pose.basis=Basis(Vector3.RIGHT,-eye_lift*weight)*eye_pose.basis
				skeleton.set_bone_global_pose(eye,eye_pose)

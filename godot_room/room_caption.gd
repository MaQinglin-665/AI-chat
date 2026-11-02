extends CanvasLayer
var actor: Node3D
var panel := PanelContainer.new()
var label := Label.new()
var mute_hint := Label.new()
var remaining := 0.
var audio_live := false
var text := ""
var head: Skeleton3D
var head_bone := -1

func _ready():
	actor=get_parent()
	head=actor.body.find_children("*","Skeleton3D",true,false)[0]
	head_bone=head.find_bone("Head")
	layer=4
	add_child(panel)
	panel.mouse_filter=Control.MOUSE_FILTER_IGNORE
	panel.add_child(label)
	label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size",20)
	label.add_theme_color_override("font_color",Color("#fff5fa"))
	var style=StyleBoxFlat.new()
	style.bg_color=Color(.11,.075,.15,.94)
	style.border_color=Color("#eaa7c6")
	style.border_width_left=3
	style.set_corner_radius_all(9)
	style.content_margin_left=14
	style.content_margin_right=14
	style.content_margin_top=8
	style.content_margin_bottom=9
	panel.add_theme_stylebox_override("panel",style)
	panel.hide()
	add_child(mute_hint)
	mute_hint.position=Vector2(14,12)
	set_muted(false)

func set_muted(value):
	mute_hint.text="M · 已静音" if value else "M · 声音开启"

func show_line(value):
	text=value
	remaining=clampf(2.+value.length()*.18,3.,60.)
	audio_live=false
	panel.visible=not text.is_empty()

func extend_for_audio(seconds):
	audio_live=true
	remaining=maxf(remaining,seconds)
	panel.visible=not text.is_empty()

func fallback_to_text():
	show_line(text)

func audio_finished():
	audio_live=false
	remaining=.18

func _process(delta):
	remaining-=delta
	if remaining<=0 and not audio_live:
		panel.hide()
		return
	var camera=get_viewport().get_camera_3d()
	if not camera or text.is_empty(): return
	var anchor=actor.global_position+Vector3.UP*1.85
	if head_bone>=0: anchor=head.to_global(head.get_bone_global_pose(head_bone).origin)+Vector3.UP*.34
	var viewport=get_viewport().get_visible_rect().size
	var pixel=camera.unproject_position(anchor)
	var behind=camera.is_position_behind(anchor)
	if behind: pixel=viewport*.5-(pixel-viewport*.5)
	var edge=behind or not Rect2(Vector2.ZERO,viewport).has_point(pixel)
	var arrow=""
	if edge:
		var direction=pixel-viewport*.5
		arrow=("← " if direction.x<0 else "→ ") if abs(direction.x)>abs(direction.y) else ("↑ " if direction.y<0 else "↓ ")
	var width=clampf(viewport.x*.42,150.,420.)
	label.custom_minimum_size.x=minf(width,label.get_theme_font("font").get_string_size(arrow+text,HORIZONTAL_ALIGNMENT_LEFT,-1,20).x+2)
	label.text=arrow+text
	panel.reset_size()
	panel.position=(pixel-Vector2(panel.size.x*.5,panel.size.y+5)).clamp(Vector2(8,8),(viewport-panel.size-Vector2(8,8)).max(Vector2(8,8)))

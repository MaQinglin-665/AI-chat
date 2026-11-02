extends SceneTree
var failures := 0
func check(test, message):
	if not test:
		failures+=1
		push_error(message)

func _initialize(): run.call_deferred()

func run():
	root.size=Vector2i(960,540)
	var room=load("res://room.tscn").instantiate()
	root.add_child(room)
	var ai=room.get_node("Companion")
	var player=room.get_node("Player")
	await process_frame
	var line="这是一句用来验证气泡自动换行的长句。".repeat(5)
	ai.caption.show_line(line)
	await process_frame
	check(ai.caption.label.text.ends_with(line),"preserve complete text")
	check(ai.caption.label.get_theme_font_size("font_size")==20,"fixed readable size")
	var eye=player.camera.global_position
	player.camera.look_at(eye+(eye-ai.position).normalized(),Vector3.UP)
	await process_frame
	ai.caption._process(.01)
	check(Rect2(Vector2.ZERO,root.size).encloses(Rect2(ai.caption.panel.position,ai.caption.panel.size)),"edge panel must stay inside viewport")
	check(ai.caption.label.text.left(1) in ["←","→","↑","↓"],"offscreen speaker has direction indicator")
	var voice=ai.voice
	var stream=AudioStreamWAV.new()
	stream.format=AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate=22050
	var bytes=PackedByteArray()
	bytes.resize(22050*2)
	for i in range(6600,16500):
		bytes.encode_s16(i*2,roundi(10000*sin(i*TAU*320./22050)))
	stream.data=bytes
	voice.start_audio(stream)
	await create_timer(.12).timeout
	check(voice.mouth<.01,"no mouth during leading silence")
	await create_timer(.36).timeout
	print("speech test voiced amplitude=",voice.mouth)
	check(voice.mouth>.01,"mouth follows audible tone")
	var m=InputEventKey.new()
	m.keycode=KEY_M
	m.pressed=true
	voice._unhandled_key_input(m)
	await process_frame
	check(voice.muted and AudioServer.is_bus_mute(voice.bus_index),"M silences character bus")
	voice._unhandled_key_input(m)
	check(not voice.muted,"M restores character bus")
	voice.start_audio(stream)
	await create_timer(.15).timeout
	check(voice.mouth<.01,"a previous FFT must not open the mouth during a new clip's leading silence")
	quit(1 if failures else 0)

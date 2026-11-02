extends Node
# Capture only between key-down and key-up. All PCM stays in this session's memory.
var bridge
var mic := AudioStreamPlayer.new()
var capture := AudioEffectCapture.new()
var bus_name: String
var holding:=false
var busy:=false
var started:=false
var stream_ok:=false
var session:=""
var pcm:=PackedByteArray()
var sent:=0
var phase:=0.
var released_at:=0

func _ready():
	bridge=get_parent()
	bus_name="RoomPTT"+str(get_instance_id())
	AudioServer.add_bus()
	var bus=AudioServer.bus_count-1
	AudioServer.set_bus_name(bus,bus_name)
	capture.buffer_length=.5
	AudioServer.add_bus_effect(bus,capture)
	AudioServer.set_bus_mute(bus,true)
	mic.bus=bus_name
	mic.stream=AudioStreamMicrophone.new()
	add_child(mic)
	bridge.ai.caption.mute_hint.text+=" · 按住 T 说话"

func _unhandled_key_input(event):
	if event is InputEventKey and event.keycode==KEY_T and not event.echo:
		if event.pressed:
			if bridge.player.entry.visible:return
			begin()
		elif holding:release()
		else:return
		get_viewport().set_input_as_handled()

func begin():
	if holding or not session.is_empty() or bridge.token.is_empty(): return
	bridge.interrupt_for_voice()
	pcm.clear()
	sent=0
	phase=0.
	released_at=0
	session="room-"+str(Time.get_ticks_usec())
	started=false
	stream_ok=false
	holding=true
	capture.clear_buffer()
	mic.play()
	bridge.ai.caption.mute_hint.text="正在听 · 松开 T 发送"
	var result=await bridge.request("asr_stream",{"action":"start","session_id":session})
	stream_ok=result.get("enabled",false)
	started=true

func release():
	if not holding:return
	drain()
	holding=false
	mic.stop()
	released_at=Time.get_ticks_msec()
	bridge.ai.caption.mute_hint.text="正在识别…"

func drain():
	var n=capture.get_frames_available()
	if n<=0:return
	var samples=capture.get_buffer(n)
	var rate=AudioServer.get_mix_rate()
	for v in samples:
		phase+=16000.
		if phase>=rate:
			phase-=rate
			if pcm.size()>=384000: break
			var index=pcm.size()
			pcm.resize(index+2)
			pcm.encode_s16(index,roundi(clampf((v.x+v.y)*.5,-1.,1.)*32767.))

func _process(_dt):
	if holding:
		drain()
		if pcm.size()>=384000: release()
	if not started or busy or session.is_empty():return
	if stream_ok and pcm.size()-sent>=19200:
		busy=true
		var chunk=pcm.slice(sent,sent+19200)
		sent+=chunk.size()
		var result=await bridge.request("asr_stream",{"action":"append","session_id":session,"audio_base64":Marshalls.raw_to_base64(chunk)})
		stream_ok=result.get("enabled",false)
		if holding and result.get("partial_text","")!="":bridge.ai.caption.mute_hint.text=str(result.partial_text)
		busy=false
	elif not holding:
		busy=true
		var text=""
		if stream_ok:
			var result=await bridge.request("asr_stream",{"action":"finish","session_id":session,"audio_base64":Marshalls.raw_to_base64(pcm.slice(sent))})
			text=str(result.get("partial_text","")).strip_edges()
		if text.is_empty() and pcm.size()>=4800:
			var result=await bridge.request("asr_pcm",{"audio_base64":Marshalls.raw_to_base64(pcm),"sample_rate":16000})
			text=str(result.get("text","")).strip_edges()
		session=""
		busy=false
		pcm.clear()
		bridge.listening=false
		bridge.ai.caption.mute_hint.text="按住 T 说话" if text else "没有听清 · 按住 T 重试"
		if text:bridge.voice_chat(text,released_at)

func _notification(what):
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and holding:release()

func _exit_tree():
	mic.stop()
	var index=AudioServer.get_bus_index(bus_name)
	if index>0:AudioServer.remove_bus(index)

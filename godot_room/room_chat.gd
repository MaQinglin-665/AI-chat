extends RefCounted
# Read one UTF-8 SSE line at a time; network buffers may split a character.
func send(host_node, port, token, payload, preview):
	var client := StreamPeerTCP.new()
	var started := Time.get_ticks_msec()
	if client.connect_to_host("127.0.0.1",port)!=OK: return ""
	var requested := false
	var headers_done := false
	var bytes := PackedByteArray()
	var text := ""
	var first := -1
	var stages := RegEx.new()
	stages.compile("[（(][^()（）]*([）)]|$)")
	while Time.get_ticks_msec()-started<45000:
		await host_node.get_tree().process_frame
		client.poll()
		if client.get_status()==StreamPeerTCP.STATUS_CONNECTING: continue
		if client.get_status()!=StreamPeerTCP.STATUS_CONNECTED: break
		if not requested:
			# The existing SSE endpoint is delimited by its done event, without Content-Length.
			var body := JSON.stringify(payload).to_utf8_buffer()
			var req = "POST /api/chat_stream HTTP/1.0\r\nHost: 127.0.0.1:%d\r\nOrigin: http://127.0.0.1:%d\r\nAuthorization: Bearer %s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"%[port,port,token,body.size()]
			if client.put_data(req.to_utf8_buffer())!=OK or client.put_data(body)!=OK: break
			requested=true
		var available=client.get_available_bytes()
		if available<=0: continue
		var chunk=client.get_data(available)
		if chunk[0]!=OK: break
		bytes.append_array(chunk[1])
		if bytes.size()>262144: break
		var end=bytes.find(10)
		while end>=0:
			var line=bytes.slice(0,end).get_string_from_utf8().strip_edges()
			bytes=bytes.slice(end+1)
			if not headers_done:
				if line.begins_with("HTTP/") and not " 200 " in line: return ""
				headers_done=line.is_empty()
			elif line.begins_with("data:"):
				var msg=JSON.parse_string(line.substr(5))
				if msg is Dictionary:
					if msg.get("type")=="done":
						client.disconnect_from_host()
						print("CHAT_TIMING first_ms=",first," full_ms=",Time.get_ticks_msec()-started)
						return str(msg.get("reply",""))
					if msg.get("type")=="delta":
						text+=str(msg.get("text",""))
						var visible=stages.sub(text,"",true).strip_edges()
						if visible:
							if first<0: first=Time.get_ticks_msec()-started
							preview.call(visible,"neutral")
			end=bytes.find(10)
	client.disconnect_from_host()
	return ""

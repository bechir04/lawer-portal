'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Play } from 'lucide-react'

export default function CameraFixPage() {
  const [roomId, setRoomId] = useState('camera-test-room')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<'lawyer' | 'client'>('lawyer')
  const [isJoined, setIsJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamInfo, setStreamInfo] = useState<any>(null)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startVideo = async () => {
    try {
      console.log('Starting video stream...')
      
      // Check if we already have a stream
      if (streamRef.current) {
        console.log('Using existing stream')
        return streamRef.current
      }
      
      // Request camera permissions first
      try {
        // This will trigger the permission prompt if needed
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        // Stop all tracks to release the device immediately
        stream.getTracks().forEach(track => track.stop())
        console.log('Camera permission granted')
      } catch (permError) {
        console.error('Camera permission error:', permError)
        throw new Error('Camera access was denied. Please allow camera permissions to continue.')
      }
      
      // Try to reuse existing stream first to avoid device conflicts
      if (streamRef.current && streamRef.current.active) {
        console.log('Reusing existing active stream')
        return streamRef.current
      }
      
      // Enumerate available devices for better cross-browser support
      let availableDevices: MediaDeviceInfo[] = []
      try {
        availableDevices = await navigator.mediaDevices.enumerateDevices()
        console.log('Available devices:', availableDevices.length)
      } catch (enumError) {
        console.log('Device enumeration failed, proceeding with basic constraints...', enumError)
      }
      
      // Try multiple approaches to avoid device conflicts across browsers
      let stream: MediaStream | null = null
      
      // Approach 1: Try with browser-optimized constraints for cross-browser compatibility
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            frameRate: 15,
            facingMode: 'user'
          },
          audio: {
            sampleRate: 44100,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        console.log('✅ Browser-optimized constraints worked - cross-browser compatible')
      } catch (basicError) {
        console.log('Browser-optimized constraints failed, trying relaxed fallback...', basicError)
        
        // Approach 2: Try with different device if available (cross-browser support)
        try {
          const videoDevices = availableDevices.filter(device => device.kind === 'videoinput')
          const audioDevices = availableDevices.filter(device => device.kind === 'audioinput')
          
          console.log(`Found ${videoDevices.length} video devices, ${audioDevices.length} audio devices`)
          
          // Try different device combinations for cross-browser compatibility
          if (videoDevices.length > 1) {
            // Try second video device if available
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: videoDevices[1].deviceId },
                width: 640,
                height: 480,
                frameRate: 15
              },
              audio: audioDevices.length > 0 ? {
                deviceId: { ideal: audioDevices[0].deviceId }
              } : true
            })
            console.log('✅ Alternative device constraints worked')
          } else {
            // Fallback to any available device
            stream = await navigator.mediaDevices.getUserMedia({
              video: videoDevices.length > 0,
              audio: audioDevices.length > 0
            })
            console.log('✅ Available device constraints worked')
          }
        } catch (deviceError) {
          console.log('Alternative device failed, trying basic...', deviceError)
          
          // Approach 3: Try basic constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            })
            console.log('✅ Basic constraints worked')
          } catch (videoError) {
            console.log('Basic constraints failed, trying video-only...', videoError)
            
            // Approach 4: Try video only
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              })
              console.log('✅ Video-only fallback worked')
            } catch (audioError) {
              console.log('Video-only failed, trying audio-only...', audioError)
              
              // Approach 5: Try audio only
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: false,
                  audio: true
                })
                console.log('✅ Audio-only fallback worked')
              } catch (finalError) {
                throw new Error('Cannot access any media devices. Please check browser permissions and ensure no other applications are using the camera.')
              }
            }
          }
        }
      }
      
      if (!stream) {
        throw new Error('Failed to get media stream')
      }

      streamRef.current = stream
      
      // Log stream details
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      
      setStreamInfo({
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks[0]?.enabled || false,
        audioEnabled: audioTracks[0]?.enabled || false,
        videoLabel: videoTracks[0]?.label || 'Unknown',
        audioLabel: audioTracks[0]?.label || 'Unknown'
      })

      // Assign stream to video element with autoplay handling
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.setAttribute('playsinline', '') // For iOS
        
        // Try to play the video
        try {
          await localVideoRef.current.play()
          console.log('Video playing successfully')
          setNeedsUserInteraction(false)
        } catch (playError) {
          console.log('Autoplay blocked, user interaction needed:', playError)
          setNeedsUserInteraction(true)
          // Show the play button overlay
          const playButton = document.createElement('button')
          playButton.textContent = 'Click to Play Video'
          playButton.style.position = 'absolute'
          playButton.style.top = '50%'
          playButton.style.left = '50%'
          playButton.style.transform = 'translate(-50%, -50%)'
          playButton.style.padding = '10px 20px'
          playButton.style.backgroundColor = '#3b82f6'
          playButton.style.color = 'white'
          playButton.style.border = 'none'
          playButton.style.borderRadius = '4px'
          playButton.style.cursor = 'pointer'
          playButton.style.zIndex = '10'
          
          playButton.onclick = async () => {
            try {
              await localVideoRef.current?.play()
              playButton.remove()
              setNeedsUserInteraction(false)
            } catch (e) {
              console.error('Failed to play after interaction:', e)
            }
          }
          
          localVideoRef.current.parentElement?.appendChild(playButton)
        }
      }

      return stream
    } catch (err: any) {
      console.error('Error starting video:', err)
      
      // Handle device in use errors specifically for cross-browser scenarios
      if (err.name === 'NotReadableError' || err.message.includes('device in use') || err.message.includes('Could not start')) {
        throw new Error('Camera/microphone is being used by another browser or application. Each browser needs independent device access. Try using the same browser in different tabs instead.')
      }
      
      // Handle permission errors
      if (err.name === 'NotAllowedError') {
        throw new Error('Camera/microphone access denied. Please allow permissions and refresh the page.')
      }
      
      // Handle device not found errors
      if (err.name === 'NotFoundError') {
        throw new Error('No camera/microphone found. Please connect a device and refresh the page.')
      }
      
      throw err
    }
  }

  const forcePlay = async () => {
    if (localVideoRef.current && streamRef.current) {
      try {
        // Reassign stream and force play
        localVideoRef.current.srcObject = streamRef.current
        localVideoRef.current.muted = true
        localVideoRef.current.setAttribute('playsinline', '')
        
        // Try to play with a small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await localVideoRef.current.play()
        setNeedsUserInteraction(false)
        console.log('Video started after user interaction')
      } 
    
  
    }
  const joinCall = async () => {
    if (!userId.trim() || !userName.trim()) {
      setError('Please enter both User ID and User Name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const stream = await startVideo()
      setIsJoined(true)
      
      console.log('Successfully joined call')
    } catch (err: any) {
      console.error('Error joining call:', err)
      setError(`Failed to join call: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const leaveCall = async () => {
    try {
      // Don't stop tracks to allow other tabs to continue using the device
      if (streamRef.current) {
        console.log('Disconnecting from stream (keeping tracks active for other tabs)')
        streamRef.current = null
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }

      setIsJoined(false)
      setStreamInfo(null)
      setNeedsUserInteraction(false)
      console.log('Left call without stopping device tracks')
    } catch (err) {
      console.error('Error leaving call:', err)
    }
  }

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        console.log('Audio toggled:', audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
        console.log('Video toggled:', videoTrack.enabled)
      }
    }
  }

  // Auto-generate IDs
  useEffect(() => {
    if (userRole === 'lawyer' && !userId) {
      setUserId('lawyer_' + Math.floor(Math.random() * 1000))
      setUserName('Lawyer ' + Math.floor(Math.random() * 100))
    } else if (userRole === 'client' && !userId) {
      setUserId('client_' + Math.floor(Math.random() * 1000))
      setUserName('Client ' + Math.floor(Math.random() * 100))
    }
  }, [userRole, userId])

  // Cleanup on unmount - but don't stop tracks to allow other tabs to continue
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('Component unmounting - keeping device tracks active for other tabs')
        streamRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Camera Fix - Video Call</h1>
          <p className="text-gray-600 mt-2">Fixes black camera issues with device sharing across multiple tabs</p>
        </div>

        {!isJoined ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join Video Call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Role</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={userRole === 'lawyer' ? 'default' : 'outline'}
                    onClick={() => setUserRole('lawyer')}
                    className="flex-1"
                  >
                    Lawyer
                  </Button>
                  <Button
                    variant={userRole === 'client' ? 'default' : 'outline'}
                    onClick={() => setUserRole('client')}
                    className="flex-1"
                  >
                    Client
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="roomId">Room ID</Label>
                <Input
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                />
              </div>
              
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Auto-generated"
                />
              </div>
              
              <div>
                <Label htmlFor="userName">User Name</Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Auto-generated"
                />
              </div>

              <Button
                onClick={joinCall}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Starting Camera...' : 'Join Call'}
              </Button>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded">
                <p><strong>🎥 Cross-Browser Device Access:</strong></p>
                <p>• Permission checking and device enumeration</p>
                <p>• Multiple device fallback strategies</p>
                <p>• Same browser tabs: device sharing</p>
                <p>• Different browsers: independent access</p>
                <p>• Detailed error messages for troubleshooting</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stream Debug Info */}
            {streamInfo && (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="text-sm">Stream Debug Info</CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-xs space-y-1">
                  <p>Video Tracks: {streamInfo.videoTracks}</p>
                  <p>Audio Tracks: {streamInfo.audioTracks}</p>
                  <p>Video Enabled: {streamInfo.videoEnabled ? '✅' : '❌'}</p>
                  <p>Audio Enabled: {streamInfo.audioEnabled ? '✅' : '❌'}</p>
                  <p>Video Device: {streamInfo.videoLabel || 'Unknown'}</p>
                  <p>Audio Device: {streamInfo.audioLabel || 'Unknown'}</p>
                </CardContent>
              </Card>
            )}

            {/* User Interaction Required */}
            {needsUserInteraction && (
              <Card className="max-w-md mx-auto border-yellow-300 bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <p className="text-yellow-800 font-semibold mb-2">Video Blocked by Browser</p>
                  <Button onClick={forcePlay} variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Click to Start Video
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Video Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Local Video */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">You ({userName}) - {userRole}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      controls={false}
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => console.log('Video metadata loaded')}
                      onCanPlay={() => console.log('Video can play')}
                      onPlay={() => console.log('Video started playing')}
                      onError={(e) => console.error('Video error:', e)}
                    />
                    {isVideoOff && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Debug overlay */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
                      {streamRef.current ? 
                        `${streamRef.current.getVideoTracks().length}V ${streamRef.current.getAudioTracks().length}A` : 
                        'No Stream'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remote Video */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Remote User</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-400">Open in SAME browser (different tab)</p>
                        <p className="text-xs text-gray-500 mt-2">Room: {roomId}</p>
                        <p className="text-xs text-yellow-600 mt-1">⚠️ Different browsers can't share camera</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <Card className="max-w-md mx-auto">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="icon"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant={isVideoOff ? "destructive" : "secondary"}
                    size="icon"
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={forcePlay}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Force Play
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={leaveCall}
                  >
                    <PhoneOff className="w-4 h-4 mr-2" />
                    Leave
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debug Info */}
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-sm">Debug Console</CardTitle>
              </CardHeader>
              <CardContent className="p-3 text-xs font-mono bg-gray-900 text-green-400 rounded">
                <div>Stream Active: {streamRef.current ? '✅' : '❌'}</div>
                <div>Video Element: {localVideoRef.current?.srcObject ? '✅' : '❌'}</div>
                <div>Video Playing: {localVideoRef.current?.paused === false ? '✅' : '❌'}</div>
                <div>Video Ready State: {localVideoRef.current?.readyState || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )

}

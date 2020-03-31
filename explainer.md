## Explainer

### Introduction

This document explains [extensions to the WEBRTC specification](https://w3c.github.io/webrtc-extensions). This document contains a number of sections, each of which contains design details to one specific extension.

### RTCRtpContributingSource extensions on captureTimestamp and senderCaptureTimeOffset

Authors:
minyue@chromium.org
hbos@chromium.org
chxg@google.com

Participate
https://www.chromestatus.com/feature/5728533701722112

#### Abstract

This section explains the two new data fields in RTCRtpContributingSource, namely captureTimestamp and senderCaptureTimeOffset, see [here](https://w3c.github.io/webrtc-extensions/#rtcrtpcontributingsource-dictionary). They are introduced for audio-video synchronization and end-to-end delay measurements.

The solution to audio-video synchronization and end-to-end delay measurements described here is particularly desired by systems, where an intermediate steam regenerator that terminates the streams originating from senders, an audio mixer as an example, is involved.

#### Introduction

In simple real-time communication systems, which involves only a sender and a receiver, the RTCP scheme [RFC3550] allows estimation of round-trip time and thus end-to-end delay.
However, in a more sophisticated system, where an intermediate stream regenerator is involved, the estimation of end-to-end delay becomes more difficult. For example, if audio mixing is performed on the server side, the server terminates inbound media streams, processes the media data, and then generates new outbound media streams with fresh synchronization information.

The solution proposed in this document is based on a new RTP header extension, namely absolute capture time, which contains two data fields:
 * an absolute capture timestamp, which is stamped by the original capturer, and is supposed to be received untouched by the end receivers.
 * an estimated clock offset with respect to the capturer's clock, which is supposed to be read and updated by every intermediate sender.

With the absolute capture timestamps, end receivers can accurately measure the audio-video synchronization performance. With the `estimated clock offset`, which gets updated at each intermediate hop, end receivers can estimate their respective clock offset with respect to the capturer's clock, and then together with the absolute capture timestamp, measure the end-to-end delay. 

The absolute capture time RTP header extension is defined [here](https://github.com/webrtc/webrtc-org/blob/gh-pages/experiments/rtp-hdrext/abs-capture-time/index.md).

The two new data fields in RTCRtpContributingSource are to surface the two data fields in the absolute capture time RTP header extension.

#### Goals

 * Facilitate calculation of audio video synchronization performance in real-time communication systems.
 * Facilitate calculation of end-to-end delay in real-time communication systems, particularly those that involve intermediate stream regenerators.

##### Non-goals

This proposal does not aim for improving the accuracy of end-to-end delay measurement in real-time communication systems that can already measure it based on RTCP based schemes.

#### [API 1]: captureTimestamp

This specification adds captureTimestamp, type of DOMHighResTimeStamp, to the RTCRtpContributingSource dictionary. This surfaces the absolute capture timestamp in the absolute capture time RTP header extension, when it is present or can be extrapolated from previously received data, for the last rendered audio or video frame. It can be used for measuring audio video synchronization performance as illustrated in the following exemplar code:

    [receiverAudio, receiverVideo] = peerconnection.getReceivers();

    latestCaptureTimestampsAudio = receiverAudio.getSynchronizationSources()[0].captureTimeStamp;
    latestCaptureTimestampsVideo = receiverVideo.getSynchronizationSources()[0].captureTimeStamp;

    avSynchronization = latestCaptureTimestampsAudio - latestCaptureTimestampsVideo;

#### [API 2]: senderCaptureTimeOffset

This specification also adds senderCaptureTimeOffset, type of DOMHighResTimeStamp, to the RTCRtpContributingSource dictionary. In this context, the sender refers to the system that directly sends RTP and RTCP packets to the receiver, and thus the sender-receiver path only represents the "last hop" in a system that involves intermediate stream regenerators.

An exemplar code to use captureTimestamp and senderCaptureTimeOffset to calculate end-to-end delay follows:

    receiver = peerconnection.getReceivers()[0];
    csrc = receiver.getSynchronizationSources()[0];
    latestCaptureTimestamps = csrc.captureTimeStamp;
    latestSenderCaptureTimeOffset = csrc.SenderCaptureTimeOffset;
    receiverTimestamp = csrc.timestamp;
    
    // Calculates sender-receiver clock offset from stats.
    stats = peerconnection.getStats();
    remoteOutboundRtpStats = getRequiredStats(stats, "remote-outbound-rtp");
    remoteInboundRtpStats = getRequiredStats(stats, "remote-inbound-rtp")
    senderReceiverTimeOffset = remoteOutboundRtpStats.timestamp - (remoteOutboundRtpStats.remoteTimestamp + remoteInboundRtpStats.roundTripTime / 2);
    
    // Calcuates sender-capturer clock offset.
    captureReceiverTimeOffset = senderReceiverTimeOffset + latestSenderCaptureTimeOffset;
    
    receiverCaptureTimestamp = latestCaptureTimestamps + captureReceiverTimeOffset;
    endToEndDelay = receiverTimestamp - receiverCaptureTimestamp.

#### Detailed design discussion

##### [Tricky design choice 1]: multiple ways to surface end-to-end delay

The proposed solution is, as [API 2], to surface the sender-capture time offset as the raw data existing the absolute capture time RTP header extension. Then the calculation of end-to-end delay requires other data, as depicted in the code example in [API 2]. Alternatively, we can surface another derived quality, even just the end-to-end delay. However, for the sake of clarity and testability in the specification, it would be best to report the raw data.

#### Considered alternatives

##### [Alternative 1] Intermediate servers bake round-trip-time from capturer in its RTCP.

If an intermediate server includes the one-way delay from the original capturer in the NTP timestamps in its RTCP packets, the end receiver does not have to care if there was a server in-between or not. The proposed way of updating the `estimated clock offset` with respect to the capturer's clock, as the second data in the absolute capture time RTP header extension, is based on the same principle.

However, without the original capture timestamp, this method may fail if the intermediate server regenerates the stream and applies RTP timestamping that does not strictly follow the capturer's clock rate. A discussion of this scheme can be found [here](https://github.com/w3c/webrtc-stats/issues/537).

##### [Alternative 2] Audio Timing Header Extension

In WebRTC, [video-timing](https://github.com/webrtc/webrtc-org/blob/gh-pages/experiments/rtp-hdrext/video-timing/index.md) has been proposed as an experimental RTP header extension. We reject the idea of reusing it for audio or adding an audio version of it, since it has a duration-based design that requires its header extension to be sent with every frame, hence consuming significantly more bandwidth than our timestamp-based design.

##### [Alternative 3] [RFC5484]: SMPTE Time-Code

We reject the proposal in [RFC5484] to use SMPTE time-codes. It seems needlessly complex for our use cases. It would also only help us solve the desynchronization metric problem, and not provide us with a solution for a one-way delay metric.

##### [Alternative 4] [RFC6051]: Rapid Synchronisation of RTP Flows

We reject the proposals in [RFC6051] since they cannot overcome the problem of synchronizing beyond mixers. The extended version of abs-capture-time does however borrow design elements from the RFC’s In-Band Delivery of Synchronisation Metadata section.

#### Stakeholder Feedback / Opposition

The proposal has been presented to W3C WG and browser implementers. While there is no signal from other implementers to implement this yet, the proposal has been reviewed without concerns raised.

Real applications, Google Hangouts and Meet, for example, have been asking for reliable audio video synchronization and end-to-end delay measurements for several years, which we can back up with [discussions](https://github.com/w3c/webrtc-stats/issues/158) from 2017.

#### References & acknowledgements

 * [RFC3550] Schulzrinne, H., Casner, S., Frederick, R. and V. Jacobson, "RTP: A
 Transport Protocl for Real-Time Applications", RFC 3550, July 2003.
 * [RFC5484] D. Singer, "Associating Time-Codes with RTP Streams", RFC 5484, March 2009.
 * [RFC6051] Perkins, C. and T. Schierl, "Rapid Synchronisation of RTP Flows", RFC 6051, November 2010.

Many thanks for valuable feedback and advice from:
Harald Alvestrand

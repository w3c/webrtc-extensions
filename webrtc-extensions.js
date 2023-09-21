var respecConfig = {
   lint: { "no-unused-dfns": false },
   "group": "webrtc",
    github: {
      repoURL: "https://github.com/w3c/webrtc-extensions/",
      branch: "main"
    },
    "xref": ["html", "webidl", "webrtc", "hr-time", "mediacapture-streams", "webrtc-stats", "infra", "dom"],
    "shortName": "webrtc-extensions",
    "specStatus": "ED",
    "subjectPrefix": "[webrtc-extensions]",
     // if there a publicly available Editor's Draft, this is the link
    edDraftURI: "https://w3c.github.io/webrtc-extensions/",
    editors:  [
      //              { name: "Your Name", url: "http://example.org/",
      //                company: "Your Company", companyURL: "http://example.com/" },
      { name: "Bernard Aboba", company: "Microsoft Corporation",
        w3cid: "65611"
      }
    ],
    formerEditors: [
      { name: "Henrik Boström", company: "Google", w3cid: "96936", retiredDate: "2021-02-01" }
    ],
    authors: [
    ],
    wgPublicList: "public-webrtc",
    otherLinks: [
      {
        key: "Participate",
        data: [
          {
            value: "Mailing list",
            href: "https://lists.w3.org/Archives/Public/public-webrtc/"
          }
        ]
      }
    ],
    localBiblio: {
      "IANA-STUN-6": {
        "title": "STUN Error Codes",
        "href": "https://www.iana.org/assignments/stun-parameters/stun-parameters.xhtml#stun-parameters-6",
        "publisher": "IANA"
      },
      "CRYPTEX": {
	"aliasOf": "RFC9335"
    }
    }
}

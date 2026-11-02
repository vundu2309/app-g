using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

// LAN prototype. The server owns all money, dice and property decisions.
public class CityTycoon : MonoBehaviour
{
    [Serializable] public class Player { public string name; public int cash, position, jailTurns; public bool jailed, bankrupt; }
    [Serializable] public class Tile { public int index, price, rent, group; public string name, type; }
    [Serializable] public class Auction { public int tile, bid, leader; public int[] passed; }
    [Serializable] public class State { public string id, phase; public Player[] players; public int turn, winner, revision; public int[] owners, dice; public string[] log; public Tile[] board; public Auction auction; }
    [Serializable] public class Identity { public string room, token; public int player; }
    [Serializable] class NameRequest { public string name; }
    [Serializable] class ActionRequest { public string action, requestId; public int value; }
    [Serializable] class ErrorResponse { public string error; }

    string address = "http://127.0.0.1:8787", playerName = "Nguoi choi", roomCode = "", bid = "10";
    string message = "Cung Mac: dung 127.0.0.1. May khac: nhap IP Wi-Fi cua may chu. Ma phong duoc tao sau khi bam TAO PHONG.";
    Identity identity;
    State state;
    bool pending;
    GameObject[] cells = new GameObject[40], tokens = new GameObject[2];
    TextMesh[] labels = new TextMesh[40];
    Material[] baseMaterials = new Material[40];
    readonly Color[] colors = { new Color(.47f,.27f,.19f),new Color(.3f,.75f,.9f),new Color(.8f,.3f,.6f),new Color(1,.55f,.2f),new Color(.9f,.22f,.25f),new Color(.96f,.8f,.25f),new Color(.22f,.65f,.4f),new Color(.2f,.35f,.85f) };
    Camera camera3D;
    float yaw = 40, zoom = 23;
    Vector2 logScroll;
    Shader surfaceShader;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot() { if (FindFirstObjectByType<CityTycoon>() == null) new GameObject("City Tycoon").AddComponent<CityTycoon>(); }

    void Start()
    {
        Application.targetFrameRate = 60;
        Application.runInBackground = true;
        Screen.orientation = ScreenOrientation.LandscapeLeft;
        camera3D = Camera.main;
        if (camera3D == null) { camera3D = new GameObject("Camera").AddComponent<Camera>(); camera3D.tag = "MainCamera"; }
        camera3D.clearFlags = CameraClearFlags.SolidColor; camera3D.backgroundColor = new Color(.035f,.055f,.09f);
        var light = new GameObject("Sun").AddComponent<Light>(); light.type = LightType.Directional; light.intensity = 1.3f; light.transform.rotation = Quaternion.Euler(55,-30,0);
        RenderSettings.ambientLight = new Color(.5f,.55f,.65f);
        Cube("Board",new Vector3(0,-.35f,0),new Vector3(17,.5f,17),new Color(.07f,.12f,.16f));
        for(int i=0;i<40;i++)
        {
            var pos = Position(i);
            cells[i] = Cube("Tile " + i,pos,new Vector3(1.35f,.18f,1.35f),new Color(.72f,.77f,.8f));
            baseMaterials[i] = cells[i].GetComponent<Renderer>().material;
            var label = new GameObject("Label " + i); label.transform.position = pos + new Vector3(0,.12f,0); label.transform.rotation = Quaternion.Euler(90,0,0);
            labels[i] = label.AddComponent<TextMesh>(); labels[i].text = i.ToString(); labels[i].fontSize = 40; labels[i].characterSize = .035f; labels[i].anchor = TextAnchor.MiddleCenter; labels[i].color = new Color(.04f,.07f,.11f);
        }
        // Original low-poly skyline; decorative buildings do not represent owned houses.
        var random = new System.Random(17);
        for(int x=-2;x<=2;x++)for(int z=-2;z<=2;z++)
        {
            float h = 1+(float)random.NextDouble()*3.5f;
            Cube("Skyline",new Vector3(x*1.7f,h/2,z*1.7f),new Vector3(.8f,h,.85f),new Color(.12f,.23f,.33f));
        }
        for(int i=0;i<2;i++)
        {
            tokens[i] = GameObject.CreatePrimitive(PrimitiveType.Sphere); tokens[i].name = "Player " + i;
            tokens[i].transform.localScale = Vector3.one*.5f; tokens[i].GetComponent<Renderer>().material = Material(i==0?Color.cyan:new Color(1,.45f,.25f));
            tokens[i].SetActive(false);
        }
        UpdateCamera(); StartCoroutine(Poll());
        Debug.Log("CITY_READY tiles=40 shader=" + surfaceShader.name);
        if(Array.IndexOf(Environment.GetCommandLineArgs(), "--lan-smoke-test") >= 0) StartCoroutine(SmokeTest());
    }

    Material Material(Color color)
    {
        if(surfaceShader == null) surfaceShader = Resources.Load<Shader>("CitySurface");
        if(surfaceShader == null || !surfaceShader.isSupported) throw new InvalidOperationException("CitySurface shader is missing or unsupported.");
        var m = new Material(surfaceShader); m.color = color; return m;
    }
    GameObject Cube(string name,Vector3 p,Vector3 s,Color c) { var o=GameObject.CreatePrimitive(PrimitiveType.Cube);o.name=name;o.transform.position=p;o.transform.localScale=s;o.GetComponent<Renderer>().material=Material(c);return o; }
    Vector3 Position(int i)
    {
        if(i<=10)return new Vector3(7.5f-i*1.5f,0,-7.5f);
        if(i<=20)return new Vector3(-7.5f,0,-7.5f+(i-10)*1.5f);
        if(i<=30)return new Vector3(-7.5f+(i-20)*1.5f,0,7.5f);
        return new Vector3(7.5f,0,7.5f-(i-30)*1.5f);
    }
    void UpdateCamera() { camera3D.transform.position=Quaternion.Euler(0,yaw,0)*new Vector3(0,zoom*.85f,-zoom);camera3D.transform.LookAt(Vector3.zero); }
    void Apply(State next)
    {
        state=next;
        for(int i=0;i<40;i++)
        {
            var t=state.board[i]; baseMaterials[i].color=t.group>=0?colors[t.group]:new Color(.72f,.77f,.8f);
            labels[i].text=i+"\n"+(t.price>0?t.price.ToString():t.name.Replace(" ","\n"));
            if(state.owners[i]>=0)labels[i].text+="\nP"+(state.owners[i]+1);
        }
        for(int i=0;i<state.players.Length;i++) { tokens[i].SetActive(true);tokens[i].transform.position=Position(state.players[i].position)+new Vector3(i==0?-.25f:.25f,.5f,0); }
    }
    IEnumerator Request(string path,string method,string json,Action<string> success)
    {
        var url=address.TrimEnd('/')+path;
        using(var req = new UnityWebRequest(url,method))
        {
            req.downloadHandler=new DownloadHandlerBuffer();req.timeout=8;
            if(json!=null) { req.uploadHandler=new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));req.SetRequestHeader("Content-Type","application/json"); }
            if(identity!=null)req.SetRequestHeader("Authorization","Bearer "+identity.token);
            UnityWebRequestAsyncOperation operation = null;
            try { operation = req.SendWebRequest(); }
            catch(Exception error) { message = "Khong the ket noi: " + error.Message; Debug.LogWarning(message); }
            if(operation == null) yield break;
            yield return operation;
            if(req.result!=UnityWebRequest.Result.Success)
            {
                var error=req.downloadHandler.text;
                try { var parsed=JsonUtility.FromJson<ErrorResponse>(error);message=parsed!=null&&!string.IsNullOrEmpty(parsed.error)?parsed.error:req.error; }
                catch { message=req.error; }
            }
            else { message="Da ket noi may chu LAN.";success(req.downloadHandler.text); }
        }
    }
    IEnumerator Connect(bool create)
    {
        pending=true;
        try
        {
            yield return Request(create?"/rooms":"/rooms/"+roomCode.Trim().ToUpperInvariant()+"/join","POST",JsonUtility.ToJson(new NameRequest{name=playerName}),text=>{
                identity=JsonUtility.FromJson<Identity>(text);roomCode=identity.room;
            });
        }
        finally { pending=false; }
    }
    IEnumerator Poll()
    {
        while(true)
        {
            if(identity!=null&&!pending)yield return Request("/rooms/"+identity.room,"GET",null,text=>Apply(JsonUtility.FromJson<State>(text)));
            yield return new WaitForSeconds(.75f);
        }
    }
    void Act(string action,int value=0) { if(!pending)StartCoroutine(Send(action,value)); }
    IEnumerator Send(string action,int value)
    {
        pending=true;
        var data=new ActionRequest{action=action,value=value,requestId=Guid.NewGuid().ToString()};
        try { yield return Request("/rooms/"+identity.room+"/commands","POST",JsonUtility.ToJson(data),text=>Apply(JsonUtility.FromJson<State>(text))); }
        finally { pending=false; }
    }
    IEnumerator SmokeTest()
    {
        bool connected=false;
        yield return Request("/health","GET",null,text=>connected=text.Contains("\"ok\":true"));
        if(connected) { Debug.Log("CITY_SMOKE_OK tiles=40 LAN_HTTP_OK"); Application.Quit(0); }
        else { Debug.LogError("CITY_SMOKE_FAILED " + message); Application.Quit(1); }
    }
    void OnGUI()
    {
        GUI.matrix=Matrix4x4.Scale(new Vector3(Screen.width/1200f,Screen.height/720f,1));
        GUILayout.BeginArea(new Rect(18,15,360,690),GUI.skin.box);
        GUILayout.Label("CITY TYCOON | LAN prototype");
        GUILayout.Label("Ban thu ket noi - chua du luat truyen thong");
        if(identity==null)
        {
            GUILayout.Label("Dia chi may chu");address=GUILayout.TextField(address,160,GUILayout.Height(36));
            GUILayout.Label("Ten cua ban");playerName=GUILayout.TextField(playerName,24,GUILayout.Height(36));
            GUI.enabled=!pending;
            if(GUILayout.Button("TAO PHONG 2 NGUOI",GUILayout.Height(45)))StartCoroutine(Connect(true));
            GUILayout.Label("Ma phong");roomCode=GUILayout.TextField(roomCode,6,GUILayout.Height(36));
            if(GUILayout.Button("VAO PHONG",GUILayout.Height(45)))StartCoroutine(Connect(false));
            GUI.enabled=true;
        }
        else
        {
            GUILayout.Label("Phong: "+identity.room+" | Ban la P"+(identity.player+1));
            if(state!=null)
            {
                foreach(var p in state.players)GUILayout.Label(p.name+": $"+p.cash+" | O "+p.position+(p.jailed?" | Trong tu":""));
                GUILayout.Label("Trang thai: "+state.phase);
                if(state.phase=="waiting")GUILayout.Label("Cho nguoi thu hai nhap ma phong...");
                else if(state.phase=="finished")GUILayout.Label("Nguoi thang: "+state.players[state.winner].name);
                else
                {
                    GUILayout.Label("Luot: "+state.players[state.turn].name);
                    GUILayout.Label("Xuc xac: "+state.dice[0]+" + "+state.dice[1]);
                    GUILayout.Label("O hien tai: "+state.board[state.players[state.turn].position].name);
                    GUI.enabled=!pending&&state.turn==identity.player;
                    if(state.phase=="roll"&&GUILayout.Button("DO XUC XAC",GUILayout.Height(46)))Act("roll");
                    if(state.phase=="buy")
                    {
                        if(GUILayout.Button("MUA DAT $"+state.board[state.players[state.turn].position].price,GUILayout.Height(44)))Act("buy");
                        if(GUILayout.Button("KHONG MUA - DAU GIA",GUILayout.Height(44)))Act("decline");
                    }
                    GUI.enabled=!pending;
                    if(state.phase=="auction"&&state.auction!=null)
                    {
                        GUILayout.Label("Dau gia: "+state.board[state.auction.tile].name+" | Gia: "+state.auction.bid);
                        bool passed=Array.IndexOf(state.auction.passed,identity.player)>=0;
                        GUI.enabled=!pending&&!passed&&state.auction.leader!=identity.player;
                        bid=GUILayout.TextField(bid,6,GUILayout.Height(34));
                        if(GUILayout.Button("TRA GIA",GUILayout.Height(40))&&int.TryParse(bid,out int amount))Act("bid",amount);
                        if(GUILayout.Button("BO DAU GIA",GUILayout.Height(40)))Act("pass");
                    }
                    GUI.enabled=true;
                }
                logScroll=GUILayout.BeginScrollView(logScroll,GUILayout.Height(180));foreach(string line in state.log)GUILayout.Label(line);GUILayout.EndScrollView();
            }
        }
        GUILayout.Label(message);GUILayout.EndArea();
        GUILayout.BeginArea(new Rect(920,18,260,130),GUI.skin.box);
        GUILayout.Label("Goc nhin");
        yaw=GUILayout.HorizontalSlider(yaw,0,360);zoom=GUILayout.HorizontalSlider(zoom,17,35);UpdateCamera();
        GUILayout.EndArea();
    }
}

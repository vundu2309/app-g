using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

public static class CityTycoonSetup
{
    [MenuItem("City Tycoon/Prepare LAN scene")]
    public static void CreateScene()
    {
        const string path = "Assets/Main.unity";
        if (!System.IO.File.Exists(path))
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, path);
        }
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
        PlayerSettings.productName = "City Tycoon";
        PlayerSettings.companyName = "City Tycoon Prototype";
        PlayerSettings.defaultScreenWidth = 1280;
        PlayerSettings.defaultScreenHeight = 720;
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
        // This prototype connects to a local Node server over HTTP.
        PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
        AssetDatabase.SaveAssets();
    }

    public static void BuildMac()
    {
        CreateScene();
        var args=System.Environment.GetCommandLineArgs();
        int at=System.Array.IndexOf(args,"-buildOutput");
        if(at<0 || at+1>=args.Length) throw new System.ArgumentException("Missing -buildOutput");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes=new[]{"Assets/Main.unity"},
            locationPathName=args[at+1],
            target=BuildTarget.StandaloneOSX,
            options=BuildOptions.None
        });
        if(report.summary.result!=BuildResult.Succeeded) throw new System.Exception("Mac build failed: "+report.summary.result);
    }
}

// Keep LAN connections working when using Build And Run directly, too.
public class CityTycoonLanBuildSettings : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;
    public void OnPreprocessBuild(BuildReport report)
    {
        PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
    }
}

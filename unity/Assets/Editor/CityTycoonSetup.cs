using UnityEditor;
using UnityEditor.SceneManagement;

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
        AssetDatabase.SaveAssets();
    }
}

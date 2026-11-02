Shader "CityTycoon/Surface"
{
    Properties { _Color ("Color", Color) = (1,1,1,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100
        CGPROGRAM
        #pragma surface surf Lambert
        fixed4 _Color;
        struct Input { float3 worldPos; };
        void surf (Input IN, inout SurfaceOutput o)
        {
            o.Albedo = _Color.rgb;
            o.Alpha = _Color.a;
        }
        ENDCG
    }
    Fallback "Diffuse"
}

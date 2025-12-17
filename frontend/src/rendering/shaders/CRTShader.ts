import * as PIXI from 'pixi.js';

export interface CRTShaderConfig {
  enabled: boolean;
  scanlineIntensity: number;
  curvature: number;
  vignetteIntensity: number;
  noiseIntensity: number;
  brightness: number;
  contrast: number;
}

export class CRTShader {
  private filter: PIXI.Filter | null = null;
  private config: CRTShaderConfig;

  constructor(config: Partial<CRTShaderConfig> = {}) {
    this.config = {
      enabled: true,
      scanlineIntensity: 0.3,
      curvature: 0.1,
      vignetteIntensity: 0.2,
      noiseIntensity: 0.05,
      brightness: 1.1,
      contrast: 1.2,
      ...config,
    };

    this.createFilter();
  }

  private createFilter(): void {
    if (!this.config.enabled) {
      this.filter = null;
      return;
    }

    // CRT shader fragment code
    const fragmentShader = `
      precision mediump float;
      
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec4 inputSize;
      uniform vec4 outputFrame;
      uniform float time;
      
      uniform float scanlineIntensity;
      uniform float curvature;
      uniform float vignetteIntensity;
      uniform float noiseIntensity;
      uniform float brightness;
      uniform float contrast;
      
      // Simple noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      // CRT curvature distortion
      vec2 curveRemapUV(vec2 uv) {
        uv = uv * 2.0 - 1.0;
        vec2 offset = abs(uv.yx) / vec2(curvature, curvature);
        uv = uv + uv * offset * offset;
        uv = uv * 0.5 + 0.5;
        return uv;
      }
      
      void main() {
        vec2 remappedUV = curveRemapUV(vTextureCoord);
        
        // Sample the texture
        vec4 color = texture2D(uSampler, remappedUV);
        
        // Apply scanlines
        float scanline = sin(remappedUV.y * inputSize.y * 2.0) * scanlineIntensity;
        color.rgb -= scanline;
        
        // Apply vignette
        vec2 vignetteUV = remappedUV * (1.0 - remappedUV.yx);
        float vignette = vignetteUV.x * vignetteUV.y * 15.0;
        vignette = pow(vignette, vignetteIntensity);
        color.rgb *= vignette;
        
        // Add noise
        float noise = random(remappedUV + time) * noiseIntensity;
        color.rgb += noise;
        
        // Apply brightness and contrast
        color.rgb = ((color.rgb - 0.5) * contrast + 0.5) * brightness;
        
        // Clamp to prevent overflow
        color.rgb = clamp(color.rgb, 0.0, 1.0);
        
        gl_FragColor = color;
      }
    `;

    // Create the filter with modern PIXI.js syntax
    this.filter = new PIXI.Filter({
      glProgram: PIXI.GlProgram.from({
        vertex: `
          attribute vec2 aPosition;
          attribute vec2 aTextureCoord;
          
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform mat3 uTextureMatrix;
          
          varying vec2 vTextureCoord;
          
          void main() {
            gl_Position = vec4((uProjectionMatrix * uWorldTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
          }
        `,
        fragment: fragmentShader,
      }),
      resources: {
        scanlineIntensity: this.config.scanlineIntensity,
        curvature: this.config.curvature,
        vignetteIntensity: this.config.vignetteIntensity,
        noiseIntensity: this.config.noiseIntensity,
        brightness: this.config.brightness,
        contrast: this.config.contrast,
        time: 0,
      },
    });
  }

  getFilter(): PIXI.Filter | null {
    return this.filter;
  }

  updateTime(deltaTime: number): void {
    if (this.filter && this.filter.resources) {
      this.filter.resources.time += deltaTime * 0.001; // Convert to seconds
    }
  }

  updateConfig(config: Partial<CRTShaderConfig>): void {
    this.config = { ...this.config, ...config };
    this.createFilter();
  }

  getConfig(): CRTShaderConfig {
    return { ...this.config };
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.createFilter();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
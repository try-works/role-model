use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaPipeBridgeProvider {
    pub provider_id: String,
    pub integration_target: String,
}

impl MediaPipeBridgeProvider {
    pub fn placeholder() -> Self {
        Self {
            provider_id: "rm_provider_mediapipe_bridge".to_string(),
            integration_target: "future-mediapipe-bridge".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::MediaPipeBridgeProvider;

    #[test]
    fn exposes_placeholder_provider() {
        let provider = MediaPipeBridgeProvider::placeholder();
        assert_eq!(provider.provider_id, "rm_provider_mediapipe_bridge");
    }
}

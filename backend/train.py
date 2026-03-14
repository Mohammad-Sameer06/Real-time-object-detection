from ultralytics import YOLO
import os

def train_custom_model(data_path, epochs=100, img_size=640, model_type="yolo26n.pt"):
    """
    Train a custom YOLO26 model.
    
    Args:
        data_path (str): Path to the dataset YAML file (e.g., 'custom_data.yaml').
        epochs (int): Number of training epochs.
        img_size (int): Image size for training.
        model_type (str): The base model to start training from (yolo26n.pt, yolo26s.pt, etc.).
    """
    # Load the base model
    model = YOLO(model_type)

    # Train the model
    # Note: Ensure your data.yaml follows the YOLOv8/YOLOv11/YOLO26 format
    print(f"Starting training on {data_path} for {epochs} epochs...")
    results = model.train(
        data=data_path,
        epochs=epochs,
        imgsz=img_size,
        plots=True,
        device=0  # Use 0 for GPU, 'cpu' for CPU
    )
    
    print("Training complete. Results saved in 'runs/detect/train'")
    return results

if __name__ == "__main__":
    # Example usage:
    # 1. Prepare your dataset in YOLO format
    # 2. Create a data.yaml file
    # 3. Update the path below and run the script
    DATASET_YAML = "path/to/your/data.yaml"
    
    if os.path.exists(DATASET_YAML):
        train_custom_model(DATASET_YAML)
    else:
        print(f"Dataset YAML not found at {DATASET_YAML}")
        print("Please provide a valid path to your dataset configuration.")
        
        # Example data.yaml structure:
        # train: ../train/images
        # val: ../val/images
        # nc: 3
        # names: ['object1', 'object2', 'object3']

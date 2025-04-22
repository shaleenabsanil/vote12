<?php
// vote_process.php
header('Content-Type: application/json');

// DB connection
$conn = new mysqli("localhost", "root", "", "voting1");
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(["error" => "Database connection failed"]);
  exit;
}

// Get input
$data = json_decode(file_get_contents("php://input"), true);
$aadhaar = $data['aadhaar'];
$email = $data['email'];
$candidateId = $data['candidateId'];

// Step 1: Check if voter exists
$stmt = $conn->prepare("SELECT VoterID FROM Voter WHERE AadhaarNumber = ? AND Email = ?");
$stmt->bind_param("ss", $aadhaar, $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
  $voter = $result->fetch_assoc();
  $voterId = $voter['VoterID'];
} else {
  // Insert new voter
  $insert = $conn->prepare("INSERT INTO Voter (AadhaarNumber, Email) VALUES (?, ?)");
  $insert->bind_param("ss", $aadhaar, $email);
  $insert->execute();
  $voterId = $insert->insert_id;
}

// Step 2: Cast vote
$vote = $conn->prepare("INSERT INTO Vote (VoterID, CandidateID) VALUES (?, ?)");
$vote->bind_param("ii", $voterId, $candidateId);

if ($vote->execute()) {
  echo json_encode(["message" => "✅ Vote cast successfully"]);
} else {
  http_response_code(500);
  echo json_encode(["error" => "❌ Failed to cast vote"]);
}

$conn->close();
?>

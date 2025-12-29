plugins {
    kotlin("jvm") version "2.0.0"
    application
}

group = "com.cloudstream"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    // Kotlin standard library
    implementation(kotlin("stdlib"))
    
    // HTTP server (Ktor)
    implementation("io.ktor:ktor-server-core:2.3.5")
    implementation("io.ktor:ktor-server-netty:2.3.5")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.5")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.5")
    implementation("io.ktor:ktor-server-cors:2.3.5")
    
    // JSON serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    
    // Logging
    implementation("ch.qos.logback:logback-classic:1.4.11")
    
    // DEX -> JAR conversion
    implementation("com.googlecode.dex2jar:dex-tools:2.1")

    // Android stubs (required for providers compiled against Android SDK)
    implementation("org.robolectric:android-all:12.1.0-robolectric-8229987")

    // Cloudstream core library – drop a built jar into jvm-bridge/libs
    implementation(fileTree("libs") { include("*.jar") })

    // GSON (manifest parsing)
    implementation("com.google.code.gson:gson:2.10.1")
    
    // ZIP file handling (for .cs3 files which are ZIP archives)
    // Java standard library includes java.util.zip
}

application {
    mainClass.set("com.cloudstream.bridge.BridgeApplicationKt")
}

// Configure Java and Kotlin to use the same JVM target (17)
// Use the installed Java but compile to JVM 17 bytecode
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions.jvmTarget = "17"
}

tasks.withType<JavaCompile> {
    sourceCompatibility = "17"
    targetCompatibility = "17"
    options.release.set(17)
}

// Create a fat JAR with all dependencies
tasks.jar {
    archiveBaseName.set("jvm-bridge")
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    
    manifest {
        attributes(
            "Main-Class" to "com.cloudstream.bridge.BridgeApplicationKt"
        )
    }
    
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
    from(sourceSets.main.get().output)
}

// Alias for building the JAR
tasks.register("buildJar") {
    dependsOn("jar")
    doLast {
        println("JAR built at: ${tasks.jar.get().archiveFile.get().asFile.absolutePath}")
    }
}

